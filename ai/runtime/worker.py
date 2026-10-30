from __future__ import annotations

import fcntl
import logging
import multiprocessing as mp
import os
import re
import stat
import subprocess
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Callable

DEFAULT_GPU_LOCK_DIRECTORY = "/tmp/dacn-ai-gpu-locks"
DEFAULT_REQUEST_TIMEOUT_SECONDS = 55
_ALLOWED_FILESYSTEMS = {"ext4", "xfs", "tmpfs", "overlay", "overlayfs"}


class WorkerState(str, Enum):
    STOPPED = "STOPPED"
    STARTING = "STARTING"
    READY = "READY"
    UNHEALTHY = "UNHEALTHY"


class RuntimeUnavailable(Exception):
    pass


class InferenceTimeout(Exception):
    pass


class InferenceFailure(Exception):
    pass


def _send_before_deadline(connection, request: dict, timeout: float) -> None:
    finished = threading.Event()
    errors = []
    def send():
        try:
            connection.send(request)
        except Exception as error:
            errors.append(error)
        finally:
            finished.set()
    threading.Thread(target=send, daemon=True).start()
    if not finished.wait(timeout):
        raise InferenceTimeout("runtime inference timed out")
    if errors:
        raise errors[0]


def _receive_before_deadline(connection, timeout: float):
    finished = threading.Event()
    result = []
    errors = []
    def receive():
        try:
            result.append(connection.recv())
        except Exception as error:
            errors.append(error)
        finally:
            finished.set()
    threading.Thread(target=receive, daemon=True).start()
    if not finished.wait(timeout):
        raise InferenceTimeout("runtime inference timed out")
    if errors:
        raise errors[0]
    return result[0]


@dataclass(frozen=True)
class WorkerConfig:
    gpu_uuid: str
    lock_directory: str = DEFAULT_GPU_LOCK_DIRECTORY
    request_timeout_seconds: float = DEFAULT_REQUEST_TIMEOUT_SECONDS
    startup_timeout_seconds: float = 600
    terminate_grace_seconds: float = 2
    kill_grace_seconds: float = 2

    def __post_init__(self):
        if not re.fullmatch(r"GPU-[0-9a-fA-F-]{36}", self.gpu_uuid):
            raise ValueError("a valid GPU UUID is required")
        if not 0 < self.request_timeout_seconds <= DEFAULT_REQUEST_TIMEOUT_SECONDS:
            raise ValueError("runtime deadline must be at most 55 seconds")
        if self.startup_timeout_seconds <= 0 or self.terminate_grace_seconds < 0 or self.kill_grace_seconds <= 0:
            raise ValueError("invalid worker lifecycle timeout")

    @classmethod
    def from_environment(cls) -> "WorkerConfig":
        gpu_uuid = os.environ.get("AI_RUNTIME_GPU_UUID", "")
        if not gpu_uuid:
            raise ValueError("GPU UUID is required")
        return cls(
            gpu_uuid=gpu_uuid,
            request_timeout_seconds=float(os.environ.get("AI_RUNTIME_DEADLINE_SECONDS", "55")),
        )


class LockUnavailable(RuntimeUnavailable):
    pass


def _filesystem_type(path: Path) -> str:
    mount_path = Path("/")
    mount_type = ""
    try:
        target = str(path.resolve())
        for line in Path("/proc/mounts").read_text().splitlines():
            fields = line.split()
            if len(fields) < 3:
                continue
            mount = Path(fields[1].replace("\\040", " "))
            if target == str(mount) or str(mount) == "/" or target.startswith(str(mount).rstrip("/") + "/"):
                if len(str(mount)) >= len(str(mount_path)):
                    mount_path, mount_type = mount, fields[2]
    except OSError:
        return ""
    return mount_type


def _validate_lock_directory(directory: Path) -> None:
    if directory.is_symlink():
        raise LockUnavailable("GPU lock directory cannot be a symlink")
    try:
        info = directory.stat()
    except OSError:
        raise LockUnavailable("GPU lock directory is unavailable") from None
    if not stat.S_ISDIR(info.st_mode) or info.st_dev != Path("/tmp").stat().st_dev:
        raise LockUnavailable("GPU lock directory must be on the local /tmp filesystem")
    if _filesystem_type(directory) not in _ALLOWED_FILESYSTEMS:
        raise LockUnavailable("GPU lock filesystem is not approved for flock")
    if str(directory) == DEFAULT_GPU_LOCK_DIRECTORY:
        if info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o1777:
            raise LockUnavailable("canonical GPU lock directory must be root-owned and sticky")
        try:
            if os.readlink("/proc/self/ns/mnt") != os.readlink("/proc/1/ns/mnt"):
                raise LockUnavailable("GPU lock path is not shared with the host mount namespace")
        except OSError:
            raise LockUnavailable("GPU lock namespace cannot be verified") from None
    elif info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) & 0o077:
        raise LockUnavailable("test GPU lock directory must be owned by this user and private")


def _create_canonical_lock_directory(path: Path) -> None:
    path.mkdir(mode=0o1777)
    os.chmod(path, 0o1777)


@contextmanager
def acquire_gpu_lock(gpu_uuid: str, directory: str = DEFAULT_GPU_LOCK_DIRECTORY):
    if not re.fullmatch(r"GPU-[0-9a-fA-F-]{36}", gpu_uuid):
        raise LockUnavailable("GPU UUID is invalid")
    path = Path(directory)
    if directory == DEFAULT_GPU_LOCK_DIRECTORY and not path.exists():
        try:
            _create_canonical_lock_directory(path)
        except FileExistsError:
            pass
        except OSError:
            raise LockUnavailable("canonical GPU lock directory cannot be created securely") from None
    _validate_lock_directory(path)
    lock_path = path / f"{gpu_uuid}.lock"
    flags = os.O_CREAT | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(lock_path, flags, 0o666)
        file_info = os.fstat(fd)
        if str(path) == DEFAULT_GPU_LOCK_DIRECTORY and file_info.st_uid != 0:
            raise LockUnavailable("canonical GPU lock files must be root-owned")
        if file_info.st_uid == os.geteuid():
            os.fchmod(fd, 0o666)
            file_info = os.fstat(fd)
        path_info = os.stat(lock_path, follow_symlinks=False)
        if (not stat.S_ISREG(file_info.st_mode) or file_info.st_nlink != 1
                or stat.S_IMODE(file_info.st_mode) & 0o666 != 0o666
                or file_info.st_dev != path.stat().st_dev
                or (file_info.st_dev, file_info.st_ino) != (path_info.st_dev, path_info.st_ino)):
            raise LockUnavailable("GPU lock file identity or permissions are unsafe")
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        path_info = os.stat(lock_path, follow_symlinks=False)
        if (file_info.st_dev, file_info.st_ino) != (path_info.st_dev, path_info.st_ino):
            raise LockUnavailable("GPU lock path changed while acquiring ownership")
    except LockUnavailable:
        if "fd" in locals():
            os.close(fd)
        raise
    except BlockingIOError:
        os.close(fd)
        raise LockUnavailable("GPU is already owned by another runtime") from None
    except OSError:
        if "fd" in locals():
            os.close(fd)
        raise LockUnavailable("GPU lock cannot be acquired") from None
    try:
        yield
    finally:
        os.close(fd)


def _verify_gpu_uuid(gpu_uuid: str) -> None:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=uuid", "--format=csv,noheader"],
            check=True, capture_output=True, text=True, timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        raise LockUnavailable("GPU identity cannot be verified") from None
    if gpu_uuid not in {line.strip() for line in result.stdout.splitlines()}:
        raise LockUnavailable("configured GPU UUID does not match an available GPU")


def _default_factory(config: WorkerConfig):
    from ai.runtime.model import ModelConfig, load_model
    model_config = ModelConfig.from_environment()
    started = time.monotonic()
    engine = load_model(model_config)
    engine.load_duration_seconds = time.monotonic() - started
    logging.getLogger(__name__).info("AI model loaded in %.3f seconds", engine.load_duration_seconds)
    return engine


def _run_inference(engine: Any, request: dict):
    if hasattr(engine, "infer"):
        return engine.infer(request)
    from ai.runtime.model import configure_model, generate
    configure_model(engine)
    return generate(request["task"], request["input"])


def _worker_main(connection, config: WorkerConfig, factory: Callable[[WorkerConfig], Any]):
    engine = None
    try:
        with acquire_gpu_lock(config.gpu_uuid, config.lock_directory):
            if factory is _default_factory:
                _verify_gpu_uuid(config.gpu_uuid)
            os.environ["CUDA_VISIBLE_DEVICES"] = config.gpu_uuid
            engine = factory(config)
            connection.send(("READY", {
                "model_id": getattr(engine, "model_id", ""),
                "prompt_versions": getattr(engine, "prompt_versions", {}),
                "load_duration_seconds": getattr(engine, "load_duration_seconds", None),
            }))
            while True:
                try:
                    request = connection.recv()
                except EOFError:
                    break
                if request is None:
                    break
                try:
                    result = _run_inference(engine, request)
                except Exception as error:
                    kind = "too_large" if error.__class__.__name__ == "InputTooLarge" else "inference_error"
                    try:
                        connection.send((kind, None))
                    except (BrokenPipeError, EOFError, OSError):
                        break
                else:
                    _write_raw_observation(request, result)
                    try:
                        connection.send(("result", result))
                    except (BrokenPipeError, EOFError, OSError):
                        break
    except LockUnavailable:
        try:
            connection.send(("UNAVAILABLE", None))
        except (BrokenPipeError, EOFError, OSError):
            pass
    except Exception:
        try:
            connection.send(("STARTUP_FAILED", None))
        except (BrokenPipeError, EOFError, OSError):
            pass
    finally:
        if engine is not None and hasattr(engine, "close"):
            try:
                engine.close()
            except Exception:
                pass
        connection.close()


def _write_raw_observation(request: dict, result: Any) -> None:
    directory = os.environ.get("AI_RUNTIME_OBSERVATION_DIR")
    if not directory or os.environ.get("AI_RUNTIME_BENCHMARK_MODE") != "1":
        return
    request_id = request.get("requestId") if isinstance(request, dict) else None
    if not isinstance(request_id, str) or not re.fullmatch(r"[a-zA-Z0-9-]{1,100}", request_id):
        raise RuntimeUnavailable("benchmark observation request ID is invalid")
    path = Path(directory)
    if path.is_symlink():
        raise RuntimeUnavailable("benchmark observation directory cannot be a symlink")
    if not path.exists():
        path.mkdir(mode=0o700)
        os.chmod(path, 0o700)
    info = path.stat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) != 0o700:
        raise RuntimeUnavailable("benchmark observation directory permissions are unsafe")
    observation = {
        "requestId": request_id,
        "generatedText": getattr(result, "raw_text", ""),
        "terminationReason": getattr(result, "termination_reason", "unknown"),
        "outputTokenCount": getattr(result, "output_token_count", None),
    }
    target = path / f"{request_id}.json"
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as stream:
        import json
        json.dump(observation, stream, ensure_ascii=False)


class WorkerController:
    def __init__(self, config: WorkerConfig, worker_factory: Callable[[WorkerConfig], Any] = _default_factory):
        self.config = config
        self.worker_factory = worker_factory
        self.state = WorkerState.STOPPED
        self.model_id = ""
        self.prompt_versions: dict[str, str] = {}
        self.load_duration_seconds: float | None = None
        self._process = None
        self._connection = None
        self._admission = threading.Lock()
        self._state_lock = threading.Lock()
        self._reaper: threading.Thread | None = None

    def start(self) -> None:
        with self._state_lock:
            if self.state is not WorkerState.STOPPED:
                raise RuntimeUnavailable("runtime worker is not stopped")
            self.state = WorkerState.STARTING
        context = mp.get_context("spawn")
        parent, child = context.Pipe(duplex=True)
        process = context.Process(target=_worker_main, args=(child, self.config, self.worker_factory), daemon=False)
        process.start()
        child.close()
        self._process, self._connection = process, parent
        if not parent.poll(self.config.startup_timeout_seconds):
            self._mark_unhealthy()
            self._stop_process(process)
            raise RuntimeUnavailable("runtime worker startup failed")
        try:
            kind, metadata = parent.recv()
        except (EOFError, OSError):
            self._mark_unhealthy()
            self._stop_process(process)
            raise RuntimeUnavailable("runtime worker startup failed") from None
        if kind != "READY":
            self._mark_unhealthy()
            self._stop_process(process)
            raise RuntimeUnavailable("runtime worker startup failed")
        self.model_id = metadata["model_id"]
        self.prompt_versions = metadata["prompt_versions"]
        self.load_duration_seconds = metadata.get("load_duration_seconds")
        with self._state_lock:
            self.state = WorkerState.READY

    def infer(self, request: dict):
        if not self._admission.acquire(blocking=False):
            raise RuntimeUnavailable("inference is already running")
        try:
            with self._state_lock:
                if self.state is not WorkerState.READY or not self._process or not self._process.is_alive():
                    self.state = WorkerState.UNHEALTHY
                    raise RuntimeUnavailable("runtime worker is unavailable")
                connection, process = self._connection, self._process
            try:
                deadline = time.monotonic() + self.config.request_timeout_seconds
                _send_before_deadline(connection, request, self.config.request_timeout_seconds)
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise InferenceTimeout("runtime inference timed out")
                kind, result = _receive_before_deadline(connection, remaining)
            except InferenceTimeout:
                self._mark_unhealthy()
                self._reaper = threading.Thread(target=self._stop_process, args=(process,), daemon=True)
                self._reaper.start()
                raise
            except (EOFError, BrokenPipeError, OSError):
                self._mark_unhealthy()
                raise RuntimeUnavailable("runtime worker exited") from None
            if kind == "result":
                return result
            self._mark_unhealthy()
            if kind == "too_large":
                raise RuntimeUnavailable("complete input exceeds model context")
            raise InferenceFailure("runtime inference failed")
        finally:
            self._admission.release()

    def _mark_unhealthy(self) -> None:
        with self._state_lock:
            if self.state is not WorkerState.UNHEALTHY:
                self.state = WorkerState.UNHEALTHY

    def _stop_process(self, process) -> None:
        if process.is_alive():
            process.terminate()
            process.join(self.config.terminate_grace_seconds)
        if process.is_alive():
            process.kill()
            process.join(self.config.kill_grace_seconds)

    def wait_stopped(self, timeout: float | None = None) -> None:
        if self._process is not None:
            self._process.join(timeout)
        if self._reaper is not None:
            self._reaper.join(timeout)

    @property
    def worker_pid(self):
        return self._process.pid if self._process is not None else None

    @property
    def process_exitcode(self):
        return self._process.exitcode if self._process is not None else None

    def close(self) -> None:
        process = self._process
        if process is None:
            with self._state_lock:
                self.state = WorkerState.STOPPED
            return
        if self.state is WorkerState.READY and self._admission.acquire(blocking=False):
            try:
                try:
                    self._connection.send(None)
                except (BrokenPipeError, EOFError, OSError):
                    pass
                process.join(self.config.terminate_grace_seconds)
            finally:
                self._admission.release()
        if process.is_alive():
            self._stop_process(process)
        if self._connection is not None:
            self._connection.close()
        with self._state_lock:
            self.state = WorkerState.STOPPED if not process.is_alive() else WorkerState.UNHEALTHY
