import multiprocessing as mp
import os
import signal
import time
from dataclasses import replace
from pathlib import Path

import pytest

try:
    from ai.runtime.model import GenerationResult
    from ai.runtime.worker import (
        DEFAULT_REQUEST_TIMEOUT_SECONDS, InferenceFailure, InferenceTimeout, RuntimeUnavailable,
        WorkerConfig, WorkerController, WorkerState,
    )
except ImportError:
    GenerationResult = DEFAULT_REQUEST_TIMEOUT_SECONDS = None
    InferenceFailure = InferenceTimeout = RuntimeUnavailable = WorkerConfig = WorkerController = WorkerState = None


def require_runtime():
    assert WorkerController is not None, "GPU-isolated runtime worker is not implemented"


class FakeFactory:
    def __init__(self, calls_file, started_file, release_file=None, delay=0, error=None, ignore_term=False):
        self.calls_file = str(calls_file)
        self.started_file = str(started_file)
        self.release_file = str(release_file) if release_file else None
        self.delay = delay
        self.error = error
        self.ignore_term = ignore_term

    def __call__(self, _config):
        Path(self.started_file + ".loaded").touch()
        return FakeEngine(self)


class FakeEngine:
    model_id = "test-model"
    prompt_versions = {"STUDENT_LEARNING_ANALYSIS": "stu-learning-analysis-v1"}

    def __init__(self, factory):
        self.factory = factory

    def infer(self, _request):
        with open(self.factory.calls_file, "a", encoding="utf-8") as stream:
            stream.write("call\n")
        Path(self.factory.started_file).touch()
        if self.factory.ignore_term:
            signal.signal(signal.SIGTERM, signal.SIG_IGN)
        if self.factory.release_file:
            while not Path(self.factory.release_file).exists():
                time.sleep(0.01)
        elif self.factory.delay:
            time.sleep(self.factory.delay)
        if self.factory.error == "__crash__":
            os._exit(99)
        if self.factory.error:
            raise RuntimeError(self.factory.error)
        return GenerationResult("{}", 1, "eos")

    def close(self):
        pass


class EnvFactory:
    def __init__(self, visible_file, calls, started):
        self.visible_file, self.calls, self.started = map(str, (visible_file, calls, started))

    def __call__(self, _config):
        Path(self.visible_file).write_text(os.environ.get('CUDA_VISIBLE_DEVICES', ''))
        return FakeEngine(FakeFactory(self.calls, self.started))


def make_controller(tmp_path, factory, **overrides):
    config = WorkerConfig(gpu_uuid="GPU-00000000-0000-0000-0000-000000000123", lock_directory=str(tmp_path), **overrides)
    return WorkerController(config, factory)


def call_count(path):
    return len(path.read_text().splitlines()) if path.exists() else 0


def _send_partial_frame(connection, release):
    import struct
    os.write(connection.fileno(),struct.pack('!i',100)+b'partial')
    release.wait()


def test_single_flight_rejects_simultaneous_second_request(tmp_path):
    require_runtime()
    calls, started = tmp_path / "calls", tmp_path / "started"
    controller = make_controller(tmp_path, FakeFactory(calls, started, delay=0.5))
    controller.start()
    try:
        import threading
        first = threading.Thread(target=controller.infer, args=({"task": "STUDENT_LEARNING_ANALYSIS"},))
        first.start()
        deadline = time.monotonic() + 2
        while not started.exists() and time.monotonic() < deadline:
            time.sleep(0.01)
        with pytest.raises(RuntimeUnavailable):
            controller.infer({"task": "STUDENT_LEARNING_ANALYSIS"})
        first.join(timeout=2)
        assert not first.is_alive()
        assert call_count(calls) == 1
    finally:
        controller.close()


def test_default_deadline_is_55_seconds_and_longer_is_rejected():
    require_runtime()
    assert DEFAULT_REQUEST_TIMEOUT_SECONDS == 55
    with pytest.raises(ValueError):
        WorkerConfig(gpu_uuid="GPU-00000000-0000-0000-0000-000000000123", request_timeout_seconds=55.1)


def test_deadline_marks_unhealthy_terminates_kills_and_joins(tmp_path):
    require_runtime()
    calls, started = tmp_path / "calls", tmp_path / "started"
    controller = make_controller(
        tmp_path, FakeFactory(calls, started, release_file=tmp_path / "never", ignore_term=True),
        request_timeout_seconds=0.1, terminate_grace_seconds=0.1,
    )
    controller.start()
    with pytest.raises(InferenceTimeout):
        controller.infer({"task": "STUDENT_LEARNING_ANALYSIS"})
    assert controller.state is WorkerState.UNHEALTHY
    with pytest.raises(RuntimeUnavailable):
        controller.infer({"task": "STUDENT_LEARNING_ANALYSIS"})
    controller.wait_stopped(timeout=2)
    assert controller.process_exitcode is not None
    assert call_count(calls) == 1


def test_deadline_includes_blocked_large_request_dispatch(tmp_path):
    require_runtime()
    import threading
    controller=make_controller(tmp_path,FakeFactory(tmp_path/'calls',tmp_path/'started'),request_timeout_seconds=.1)
    controller.start()
    os.kill(controller.worker_pid,signal.SIGSTOP)
    outcome=[]
    def invoke():
        try: controller.infer({'task':'STUDENT_LEARNING_ANALYSIS','large':'x'*(2*1024*1024)})
        except Exception as error: outcome.append(error)
    thread=threading.Thread(target=invoke); thread.start()
    try:
        thread.join(.4)
        assert not thread.is_alive(), 'large request dispatch escaped the worker deadline'
        assert outcome and isinstance(outcome[0],InferenceTimeout)
        assert controller.state is WorkerState.UNHEALTHY
    finally:
        if thread.is_alive(): os.kill(controller.worker_pid,signal.SIGCONT)
        controller.wait_stopped(timeout=2)
        controller.close()


def test_deadline_covers_partial_worker_response_frame():
    require_runtime()
    import ai.runtime.worker as worker
    receive,send=mp.Pipe(duplex=False)
    release=mp.Event(); child=mp.Process(target=_send_partial_frame,args=(send,release)); child.start(); send.close()
    try:
        with pytest.raises(InferenceTimeout): worker._receive_before_deadline(receive,.05)
    finally:
        child.terminate(); child.join(1); receive.close()


def test_inference_crash_marks_unhealthy_without_retry(tmp_path):
    require_runtime()
    calls, started = tmp_path / "calls", tmp_path / "started"
    controller = make_controller(tmp_path, FakeFactory(calls, started, error="CUDA out of memory"))
    controller.start()
    try:
        with pytest.raises(InferenceFailure):
            controller.infer({"task": "STUDENT_LEARNING_ANALYSIS"})
        assert controller.state is WorkerState.UNHEALTHY
        with pytest.raises(RuntimeUnavailable):
            controller.infer({"task": "STUDENT_LEARNING_ANALYSIS"})
        assert call_count(calls) == 1
    finally:
        controller.close()


def test_second_controller_cannot_initialize_same_gpu_until_lock_released(tmp_path):
    require_runtime()
    first_calls, first_started = tmp_path / "first-calls", tmp_path / "first-started"
    second_calls, second_started = tmp_path / "second-calls", tmp_path / "second-started"
    first = make_controller(tmp_path, FakeFactory(first_calls, first_started))
    first.start()
    second = make_controller(tmp_path, FakeFactory(second_calls, second_started))
    try:
        with pytest.raises(RuntimeUnavailable):
            second.start()
        assert not second_started.exists()
        assert not Path(str(second_started) + ".loaded").exists()
        assert not second_calls.exists()
    finally:
        first.close()
        second.close()
    fresh = make_controller(tmp_path, FakeFactory(second_calls, second_started))
    fresh.start()
    try:
        assert fresh.state is WorkerState.READY
    finally:
        fresh.close()


def _orphaning_parent(lock_directory, calls, started, release, ready):
    config = WorkerConfig(gpu_uuid="GPU-00000000-0000-0000-0000-000000000123", lock_directory=lock_directory, request_timeout_seconds=15)
    controller = WorkerController(config, FakeFactory(calls, started, release_file=release, ignore_term=True))
    controller.start()
    Path(ready).write_text(str(controller.worker_pid))
    controller.infer({"task": "STUDENT_LEARNING_ANALYSIS"})


def _process_running(pid):
    try:
        state = Path(f"/proc/{pid}/stat").read_text().split()[2]
        return state != "Z"
    except FileNotFoundError:
        return False


def test_orphan_child_holds_gpu_lock_after_parent_death_until_reaped(tmp_path):
    require_runtime()
    calls, started, release, ready = [tmp_path / name for name in ("calls", "started", "release", "ready")]
    context = mp.get_context("spawn")
    parent = context.Process(target=_orphaning_parent, args=(str(tmp_path), str(calls), str(started), str(release), str(ready)))
    parent.start()
    deadline = time.monotonic() + 8
    while (not started.exists() or not ready.exists()) and time.monotonic() < deadline:
        time.sleep(0.01)
    worker_pid = None
    try:
        assert started.exists() and ready.exists()
        worker_pid = int(ready.read_text())
        parent.terminate()
        parent.join(timeout=2)
        assert not parent.is_alive()
        assert _process_running(worker_pid)

        second_started = tmp_path / "second-started"
        second = make_controller(tmp_path, FakeFactory(tmp_path / "second-calls", second_started))
        try:
            with pytest.raises(RuntimeUnavailable):
                second.start()
            assert not second_started.exists()
            assert not Path(str(second_started) + ".loaded").exists()
            assert call_count(calls) == 1
        finally:
            second.close()
    finally:
        if parent.is_alive():
            parent.terminate()
            parent.join(timeout=2)
        release.touch()
    deadline = time.monotonic() + 5
    while worker_pid is not None and _process_running(worker_pid) and time.monotonic() < deadline:
        time.sleep(0.02)
    assert worker_pid is not None and not _process_running(worker_pid)
    fresh = make_controller(tmp_path, FakeFactory(tmp_path / "fresh-calls", tmp_path / "fresh-started"))
    fresh.start()
    try:
        assert fresh.state is WorkerState.READY
    finally:
        fresh.close()


def test_worker_never_unlinks_gpu_lock_file_on_shutdown_or_restart(tmp_path):
    require_runtime()
    calls, started = tmp_path / "calls", tmp_path / "started"
    lock_path = tmp_path / "GPU-00000000-0000-0000-0000-000000000123.lock"
    first = make_controller(tmp_path, FakeFactory(calls, started))
    first.start()
    inode = lock_path.stat().st_ino
    first.close()
    assert lock_path.exists()
    second = make_controller(tmp_path, FakeFactory(tmp_path / "next-calls", tmp_path / "next-started"))
    second.start()
    try:
        assert lock_path.stat().st_ino == inode
    finally:
        second.close()


def test_worker_process_crash_marks_unhealthy_without_retry(tmp_path):
    require_runtime()
    calls, started = tmp_path / "crash-calls", tmp_path / "crash-started"
    controller = make_controller(tmp_path, FakeFactory(calls, started, error="__crash__"))
    controller.start()
    try:
        with pytest.raises(RuntimeUnavailable):
            controller.infer({"task": "STUDENT_LEARNING_ANALYSIS"})
        assert controller.state is WorkerState.UNHEALTHY
        with pytest.raises(RuntimeUnavailable):
            controller.infer({"task": "STUDENT_LEARNING_ANALYSIS"})
        assert call_count(calls) == 1
        assert controller.process_exitcode == 99
    finally:
        controller.close()


def test_gpu_lock_refuses_symlink_lock_file(tmp_path):
    require_runtime()
    from ai.runtime.worker import acquire_gpu_lock
    target = tmp_path / "target"
    target.write_text("keep")
    lock = tmp_path / "GPU-00000000-0000-0000-0000-000000000123.lock"
    lock.symlink_to(target)
    with pytest.raises(RuntimeUnavailable):
        with acquire_gpu_lock("GPU-00000000-0000-0000-0000-000000000123", str(tmp_path)):
            pytest.fail("symlink lock should fail closed")
    assert target.read_text() == "keep"


def test_lock_refuses_unapproved_filesystem_and_unsafe_default_directory(tmp_path, monkeypatch):
    require_runtime()
    import ai.runtime.worker as worker
    monkeypatch.setattr(worker, "_filesystem_type", lambda _path: "nfs")
    with pytest.raises(RuntimeUnavailable):
        with worker.acquire_gpu_lock("GPU-00000000-0000-0000-0000-000000000123", str(tmp_path)):
            pytest.fail("network filesystem lock must fail closed")

    monkeypatch.setattr(worker, "_filesystem_type", lambda _path: "tmpfs")
    monkeypatch.setattr(worker, "DEFAULT_GPU_LOCK_DIRECTORY", str(tmp_path))
    with pytest.raises(RuntimeUnavailable):
        worker._validate_lock_directory(tmp_path)


def test_default_worker_verifies_actual_gpu_uuid_before_model_load(monkeypatch):
    require_runtime()
    import types
    import ai.runtime.worker as worker
    calls = []
    def fake_run(command, **kwargs):
        calls.append((command, kwargs))
        return types.SimpleNamespace(stdout="GPU-00000000-0000-0000-0000-000000000123\n")
    monkeypatch.setattr(worker.subprocess, "run", fake_run)
    worker._verify_gpu_uuid("GPU-00000000-0000-0000-0000-000000000123")
    assert calls[0][0] == ["nvidia-smi", "--query-gpu=uuid", "--format=csv,noheader"]
    with pytest.raises(RuntimeUnavailable):
        worker._verify_gpu_uuid("GPU-00000000-0000-0000-0000-000000000456")


def test_gpu_uuid_is_bound_in_child_and_raw_observation_is_opt_in_private(tmp_path, monkeypatch):
    require_runtime()
    monkeypatch.setenv('AI_RUNTIME_BENCHMARK_MODE', '1')
    monkeypatch.setenv('AI_RUNTIME_OBSERVATION_DIR', str(tmp_path / 'observations'))
    visible = tmp_path / 'visible'
    controller = make_controller(tmp_path / 'locks', EnvFactory(visible, tmp_path / 'calls', tmp_path / 'started'))
    controller.config.lock_directory and Path(controller.config.lock_directory).mkdir(mode=0o700)
    controller.start()
    controller.infer({'requestId': 'request-raw-test'})
    controller.close()
    observation = tmp_path / 'observations/request-raw-test.json'
    assert visible.read_text() == controller.config.gpu_uuid
    assert observation.stat().st_mode & 0o777 == 0o600
    assert observation.read_text() == '{"requestId": "request-raw-test", "generatedText": "{}", "terminationReason": "eos", "outputTokenCount": 1}'
    assert 'input' not in observation.read_text()


def test_canonical_lock_directory_creation_overrides_umask(tmp_path):
    require_runtime()
    import ai.runtime.worker as worker
    previous = os.umask(0o022)
    try:
        path = tmp_path / 'canonical'
        worker._create_canonical_lock_directory(path)
    finally:
        os.umask(previous)
    assert path.stat().st_mode & 0o7777 == 0o1777
