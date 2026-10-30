import ast
import importlib
import json
import os
import pathlib
import signal
import subprocess
import sys
import tempfile
import time
import urllib.request
from types import SimpleNamespace


NOTEBOOK = pathlib.Path(__file__).parents[1] / "colab" / "serve-ai.ipynb"


def notebook():
    return json.loads(NOTEBOOK.read_text(encoding="utf-8"))


def code_sources():
    return ["".join(cell["source"]) for cell in notebook()["cells"] if cell["cell_type"] == "code"]


def helper_namespace(**overrides):
    namespace = {
        "os": os,
        "importlib": importlib,
        "pathlib": pathlib,
        "Path": pathlib.Path,
        "re": __import__("re"),
        "json": json,
        "signal": signal,
        "subprocess": subprocess,
        "time": time,
        "urlopen": urllib.request.urlopen,
        "sys": sys,
        "tempfile": tempfile,
        "RUNTIME_PINS": {
            "fastapi": ("0.162.0", "fastapi==0.162.0"),
            "uvicorn": ("0.54.0", "uvicorn==0.54.0"),
            "jsonschema": ("4.26.0", "jsonschema[format]==4.26.0"),
            "transformers": ("5.21.0", "transformers==5.21.0"),
            "accelerate": ("1.15.0", "accelerate==1.15.0"),
            "lm-format-enforcer": ("0.11.3", "lm-format-enforcer==0.11.3"),
        },
        "MODEL_ID": "Qwen/Qwen2.5-1.5B-Instruct",
        "MODEL_REVISION": "989aa7980e4cf806f80c7fef2b1adb7bc71aa306",
        "runtime_token": None,
    }
    definitions = []
    for source in code_sources():
        definitions.extend(node for node in ast.parse(source).body if isinstance(node, ast.FunctionDef))
    module = ast.fix_missing_locations(ast.Module(body=definitions, type_ignores=[]))
    exec(compile(module, str(NOTEBOOK), "exec"), namespace)
    namespace.update(overrides)
    return namespace


def test_notebook_is_five_code_cells_with_separate_setup_environment_start_status_and_stop_instructions():
    cells = notebook()["cells"]
    sources = code_sources()
    assert len(sources) == 5
    joined = "\n".join(sources)
    assert "checkout_source" in joined
    assert "verify_colab_environment" in joined
    assert "start_runtime" in joined
    assert "runtime_status" in joined
    assert "stop_runtime()" in joined


def test_run_all_leaves_runtime_running_and_stop_is_only_explicitly_callable():
    stop_calls = []
    for source in code_sources():
        tree = ast.parse(source)
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                continue
            stop_calls.extend(
                child for child in ast.walk(node)
                if isinstance(child, ast.Call) and isinstance(child.func, ast.Name) and child.func.id == "stop_runtime"
            )
    assert not stop_calls
    namespace = helper_namespace(server=None, log_file=None, log_path=pathlib.Path("unused.log"))
    assert callable(namespace["stop_runtime"])


def test_checkout_rejects_moving_refs_before_running_git():
    calls = []

    def fake_run(*args, **kwargs):
        calls.append(args)

    namespace = helper_namespace(subprocess=type("Subprocess", (), {"run": fake_run})())
    try:
        namespace["checkout_source"]("https://example.invalid/repo.git", "main")
    except ValueError:
        pass
    else:
        raise AssertionError("mutable refs must be rejected")
    assert calls == []


def test_checkout_rejects_a_commit_that_does_not_match_rev_parse(tmp_path):
    calls = []

    class Git:
        DEVNULL = subprocess.DEVNULL

        @staticmethod
        def run(args, **_kwargs):
            calls.append(args)
            target = pathlib.Path(args[-1]) if args[0] == "git" and args[1] == "clone" else pathlib.Path(args[3])
            if "clone" in args:
                target.mkdir(parents=True, exist_ok=True)
                (target / "ai" / "runtime").mkdir(parents=True)
                (target / "ai" / "runtime" / "app.py").touch()

        @staticmethod
        def check_output(*_args, **_kwargs):
            return "0" * 40 + "\n"

    namespace = helper_namespace(subprocess=Git)
    try:
        namespace["checkout_source"]("https://example.invalid/repo.git", "1" * 40, root=tmp_path)
    except RuntimeError:
        pass
    else:
        raise AssertionError("a different checked-out commit must be rejected")
    assert calls


def test_checkout_rejects_modified_or_untracked_python_source_at_the_pinned_commit(tmp_path):
    class Git:
        DEVNULL = subprocess.DEVNULL

        @staticmethod
        def run(args, **_kwargs):
            if "clone" in args:
                target = pathlib.Path(args[-1])
                (target / "ai" / "runtime").mkdir(parents=True)
                (target / "ai" / "runtime" / "app.py").touch()

        @staticmethod
        def check_output(args, **_kwargs):
            if args[-2:] == ["rev-parse", "HEAD"]:
                return "1" * 40 + "\n"
            if args[-2:] == ["--porcelain", "--untracked-files=all"]:
                return " M ai/runtime/app.py\n"
            if "--ignored" in args:
                return ""
            raise AssertionError(args)

    namespace = helper_namespace(subprocess=Git)
    try:
        namespace["checkout_source"]("https://example.invalid/repo.git", "1" * 40, root=tmp_path)
    except RuntimeError as error:
        assert "clean" in str(error).lower()
    else:
        raise AssertionError("modified source at the pinned SHA must be rejected")


def test_checkout_rejects_ignored_untracked_python_source(tmp_path):
    class Git:
        DEVNULL = subprocess.DEVNULL

        @staticmethod
        def run(args, **_kwargs):
            if "clone" in args:
                target = pathlib.Path(args[-1])
                (target / "ai" / "runtime").mkdir(parents=True)
                (target / "ai" / "runtime" / "app.py").touch()

        @staticmethod
        def check_output(args, **_kwargs):
            if args[-2:] == ["rev-parse", "HEAD"]:
                return "1" * 40 + "\n"
            if args[-2:] == ["--porcelain", "--untracked-files=all"]:
                return ""
            if "--ignored" in args:
                assert "-z" in args
                return "ai/runtime/注入.py\0"
            raise AssertionError(args)

    namespace = helper_namespace(subprocess=Git)
    try:
        namespace["checkout_source"]("https://example.invalid/repo.git", "1" * 40, root=tmp_path)
    except RuntimeError as error:
        assert "python" in str(error).lower() or "clean" in str(error).lower()
    else:
        raise AssertionError("ignored untracked Python source must be rejected")


def test_checkout_rejects_ignored_sourceless_and_native_python_modules(tmp_path):
    class Git:
        DEVNULL = subprocess.DEVNULL

        @staticmethod
        def run(args, **_kwargs):
            if "clone" in args:
                target = pathlib.Path(args[-1])
                (target / "ai" / "runtime").mkdir(parents=True)
                (target / "ai" / "runtime" / "app.py").touch()

        @staticmethod
        def check_output(args, **_kwargs):
            if args[-2:] == ["rev-parse", "HEAD"]:
                return "1" * 40 + "\n"
            if args[-2:] == ["--porcelain", "--untracked-files=all"]:
                return ""
            if "--ignored" in args:
                assert "-z" in args
                return "ai/runtime/backdoor.pyc\0ai/runtime/native.cpython-312-x86_64-linux-gnu.so\0"
            raise AssertionError(args)

    namespace = helper_namespace(subprocess=Git)
    try:
        namespace["checkout_source"]("https://example.invalid/repo.git", "1" * 40, root=tmp_path)
    except RuntimeError as error:
        assert "clean" in str(error).lower()
    else:
        raise AssertionError("ignored importable Python artifacts must be rejected")


def test_missing_dependency_install_fails_before_mutation_when_resolver_would_change_existing_packages(monkeypatch):
    calls = []
    installed = {"fastapi": "0.162.0", "torch": "2.11.0+cu130"}
    versions = iter([installed, installed])

    class FakeSubprocess:
        STDOUT = subprocess.STDOUT
        CalledProcessError = subprocess.CalledProcessError

        @staticmethod
        def run(args, **kwargs):
            calls.append(args)
            if "--dry-run" in args:
                raise subprocess.CalledProcessError(1, args)

    namespace = helper_namespace(subprocess=FakeSubprocess, _installed_package_versions=lambda: next(versions))
    try:
        namespace["install_missing_runtime_dependencies"]()
    except RuntimeError:
        pass
    else:
        raise AssertionError("resolver conflict must stop before installation")
    assert len(calls) == 1 and "--dry-run" in calls[0]


def test_start_runtime_clears_inherited_lite_modes_and_returns_with_server_alive(tmp_path):
    seen = {}

    class RunningProcess:
        pid = 4321

        def poll(self):
            return None

    class FakeSubprocess:
        STDOUT = subprocess.STDOUT
        Popen = None
        TimeoutExpired = subprocess.TimeoutExpired

    def fake_popen(args, **kwargs):
        seen["args"] = args
        seen["env"] = kwargs["env"]
        kwargs["stdout"].write("INFO: AI model loaded in 8.125 seconds\nINFO: Application startup complete\n")
        kwargs["stdout"].flush()
        return RunningProcess()

    FakeSubprocess.Popen = fake_popen
    namespace = helper_namespace(
        server=None,
        log_file=None,
        log_path=tmp_path / "uvicorn.log",
        runtime_token=None,
        subprocess=FakeSubprocess,
        os=SimpleNamespace(
            environ={"AI_RUNTIME_LITE_DIAGNOSTICS": "1", "AI_RUNTIME_LITE_DIAGNOSTICS_DIR": "/tmp/raw", "AI_RUNTIME_BENCHMARK_MODE": "1"},
            killpg=lambda *_args: None,
        ),
        time=SimpleNamespace(monotonic=time.monotonic, sleep=lambda _seconds: None),
    )
    namespace["start_runtime"](tmp_path, "GPU-00000000-0000-0000-0000-000000000123", "hidden-token")
    assert namespace["server"].poll() is None
    assert seen["args"][seen["args"].index("--host") + 1] == "127.0.0.1"
    assert seen["env"]["AI_RUNTIME_GPU_UUID"].endswith("000000000123")
    assert seen["env"]["AI_RUNTIME_TOKEN"] == "hidden-token"
    assert seen["env"]["PYTHONDONTWRITEBYTECODE"] == "1"
    assert "AI_RUNTIME_LITE_DIAGNOSTICS" not in seen["env"]
    assert "AI_RUNTIME_LITE_DIAGNOSTICS_DIR" not in seen["env"]
    assert "AI_RUNTIME_BENCHMARK_MODE" not in seen["env"]


def test_start_again_while_serving_does_not_create_or_load_a_second_model(tmp_path):
    class RunningProcess:
        def poll(self):
            return None

    calls = []
    namespace = helper_namespace(server=RunningProcess(), log_file=None, runtime_token=None)
    result = namespace["start_runtime"](tmp_path, "GPU-00000000-0000-0000-0000-000000000123", "unused-token")
    assert result["status"] == "ALREADY_RUNNING"
    assert calls == []


def test_start_cleans_orphaned_process_group_before_restarting_after_server_exit(tmp_path):
    killed = []

    class ExitedProcess:
        pid = 7654

        def poll(self):
            return 1

        def wait(self, timeout):
            return 1

    class RunningProcess:
        pid = 8765

        def poll(self):
            return None

    class FakeSubprocess:
        STDOUT = subprocess.STDOUT
        TimeoutExpired = subprocess.TimeoutExpired
        Popen = None

    def fake_popen(_args, **kwargs):
        calls.append(True)
        kwargs["stdout"].write("AI model loaded in 1.0 seconds\nApplication startup complete\n")
        kwargs["stdout"].flush()
        return RunningProcess()

    calls = []
    FakeSubprocess.Popen = fake_popen
    log_file = open(tmp_path / "old.log", "w", encoding="utf-8")
    namespace = helper_namespace(
        server=ExitedProcess(), log_file=log_file, log_path=tmp_path / "uvicorn.log", runtime_token="old-token",
        subprocess=FakeSubprocess,
        os=SimpleNamespace(environ={}, killpg=lambda group, sig: killed.append((group, sig))),
        time=SimpleNamespace(monotonic=time.monotonic, sleep=lambda _seconds: None),
    )
    namespace["start_runtime"](tmp_path, "GPU-00000000-0000-0000-0000-000000000123", "new-token")
    assert calls == [True]
    assert (7654, signal.SIGTERM) in killed
    assert namespace["server"].pid == 8765


def test_start_failure_cleans_up_process_and_redacts_token(tmp_path):
    class ExitedProcess:
        pid = 4322

        def poll(self):
            return 1

        def wait(self, timeout):
            return 1

    class FakeSubprocess:
        STDOUT = subprocess.STDOUT
        TimeoutExpired = subprocess.TimeoutExpired
        Popen = None

    def fake_popen(_args, **kwargs):
        kwargs["stdout"].write("bad token: hidden-token\n")
        kwargs["stdout"].flush()
        return ExitedProcess()

    FakeSubprocess.Popen = fake_popen
    killed = []
    namespace = helper_namespace(
        server=None,
        log_file=None,
        log_path=tmp_path / "uvicorn.log",
        runtime_token=None,
        subprocess=FakeSubprocess,
        os=SimpleNamespace(environ={}, killpg=lambda *args: killed.append(args)),
        time=SimpleNamespace(monotonic=time.monotonic, sleep=lambda _seconds: None),
    )
    try:
        namespace["start_runtime"](tmp_path, "GPU-00000000-0000-0000-0000-000000000123", "hidden-token")
    except RuntimeError as error:
        assert "hidden-token" not in str(error)
    else:
        raise AssertionError("unexpected server exit must fail startup")
    assert killed


def test_start_timeout_cleans_up_the_server_process_group(tmp_path):
    killed = []

    class RunningProcess:
        pid = 9877

        def poll(self):
            return None

        def terminate(self):
            pass

        def wait(self, timeout):
            return -signal.SIGTERM

    class FakeSubprocess:
        STDOUT = subprocess.STDOUT
        TimeoutExpired = subprocess.TimeoutExpired
        Popen = None

    FakeSubprocess.Popen = lambda _args, **_kwargs: RunningProcess()
    ticks = iter([0, 601])
    namespace = helper_namespace(
        server=None, log_file=None, log_path=tmp_path / "uvicorn.log", runtime_token=None,
        subprocess=FakeSubprocess,
        os=SimpleNamespace(environ={}, killpg=lambda group, sig: killed.append((group, sig))),
        time=SimpleNamespace(monotonic=lambda: next(ticks), sleep=lambda _seconds: None),
    )
    try:
        namespace["start_runtime"](tmp_path, "GPU-00000000-0000-0000-0000-000000000123", "token")
    except RuntimeError as error:
        assert "did not reach READY" in str(error)
    else:
        raise AssertionError("worker startup timeout must be reported")
    assert (9877, signal.SIGTERM) in killed
    assert (9877, signal.SIGKILL) in killed


def test_explicit_stop_allows_a_later_start_to_create_a_new_process(tmp_path):
    # This checks the user-facing lifecycle: stopped state is cleared and a later
    # explicit Start can own a fresh process without touching a live serving run.
    class Process:
        pid = 9876

        def poll(self):
            return -signal.SIGTERM

        def wait(self, timeout):
            return -signal.SIGTERM

        def wait(self, timeout):
            return -signal.SIGTERM

        def terminate(self):
            pass

    log_file = open(tmp_path / "uvicorn.log", "w", encoding="utf-8")
    namespace = helper_namespace(
        server=Process(),
        log_file=log_file,
        log_path=tmp_path / "uvicorn.log",
        os=SimpleNamespace(killpg=lambda *_args: None),
        subprocess=type("Subprocess", (), {"TimeoutExpired": subprocess.TimeoutExpired})(),
        time=SimpleNamespace(sleep=lambda _seconds: None),
    )
    namespace["stop_runtime"]()
    assert namespace["server"] is None
    assert namespace["log_file"] is None


def test_dependency_plan_installs_only_missing_packages_and_constrains_torch_and_existing_versions():
    namespace = helper_namespace()
    plan = namespace["dependency_plan"]({"fastapi": "0.162.0", "torch": "2.11.0+cu130", "numpy": "2.2.0"}, "2.11.0+cu130")
    assert plan["install"] == [
        "uvicorn==0.54.0", "jsonschema[format]==4.26.0", "transformers==5.21.0",
        "accelerate==1.15.0", "lm-format-enforcer==0.11.3",
    ]
    assert "fastapi==0.162.0" in plan["constraints"]
    assert "torch==2.11.0+cu130" in plan["constraints"]
    assert "numpy==2.2.0" in plan["constraints"]


def test_dependency_plan_installs_jsonschema_format_extras_if_base_package_lacks_them():
    namespace = helper_namespace(
        importlib=SimpleNamespace(metadata=SimpleNamespace(requires=lambda _name: [
            'jsonschema-format-dep==1.0; extra == "format"',
        ])),
        Requirement=lambda value: SimpleNamespace(
            name=value.split("==")[0].lower(),
            specifier=SimpleNamespace(contains=lambda _version, **_kwargs: False),
            marker=SimpleNamespace(evaluate=lambda _environment: True),
        ),
    )
    plan = namespace["dependency_plan"]({"jsonschema": "4.26.0"}, "2.11.0+cu130")
    assert "jsonschema[format]==4.26.0" in plan["install"]


def test_dependency_plan_fails_closed_for_incompatible_installed_runtime_dependency():
    namespace = helper_namespace()
    try:
        namespace["dependency_plan"]({"fastapi": "0.80.0", "torch": "2.11.0+cu130"}, "2.11.0+cu130")
    except RuntimeError:
        pass
    else:
        raise AssertionError("wrong installed runtime versions must not be upgraded")


def test_dependency_plan_reuses_compatible_colab_fastapi_and_uvicorn_versions():
    namespace = helper_namespace()
    installed = {"fastapi": "0.116.1", "uvicorn": "0.35.0", "torch": "2.11.0+cu130"}
    plan = namespace["dependency_plan"](installed, installed["torch"])
    assert "fastapi==0.162.0" not in plan["install"]
    assert "uvicorn==0.54.0" not in plan["install"]
    assert "fastapi==0.116.1" in plan["constraints"]
    assert "uvicorn==0.35.0" in plan["constraints"]


def test_dependency_plan_rejects_fastapi_without_lifespan_support():
    namespace = helper_namespace()
    try:
        namespace["dependency_plan"]({"fastapi": "0.92.0", "torch": "2.11.0+cu130"}, "2.11.0+cu130")
    except RuntimeError as error:
        assert "fastapi" in str(error).lower()
    else:
        raise AssertionError("FastAPI before lifespan support must be rejected")


def test_dependency_plan_accepts_minimum_fastapi_and_uvicorn_lifespan_versions():
    namespace = helper_namespace()
    plan = namespace["dependency_plan"](
        {"fastapi": "0.93.0", "uvicorn": "0.21.0", "torch": "2.11.0+cu130"},
        "2.11.0+cu130",
    )
    assert "fastapi==0.162.0" not in plan["install"]
    assert "uvicorn==0.54.0" not in plan["install"]


def test_dependency_plan_rejects_framework_versions_outside_supported_range():
    namespace = helper_namespace()
    for installed in (
        {"fastapi": "1.0.0", "torch": "2.11.0+cu130"},
        {"uvicorn": "0.20.0", "torch": "2.11.0+cu130"},
        {"uvicorn": "1.0.0", "torch": "2.11.0+cu130"},
    ):
        try:
            namespace["dependency_plan"](installed, installed["torch"])
        except RuntimeError:
            pass
        else:
            raise AssertionError(f"unsupported installed framework versions must fail closed: {installed}")


def test_runtime_status_reports_http_availability_separately_from_startup_ready(tmp_path):
    class Response:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            pass

    class RunningProcess:
        def poll(self):
            return None

    log = tmp_path / "uvicorn.log"
    log.write_text("INFO: Application startup complete\nINFO: AI model loaded in 8.125 seconds\n")
    namespace = helper_namespace(server=RunningProcess(), log_path=log, urlopen=lambda *_a, **_kw: Response())
    status = namespace["runtime_status"]()
    assert status["http"] == "ACTIVE"
    assert status["worker_model"] == "READY_AT_STARTUP"


def test_http_availability_does_not_claim_worker_ready_without_startup_markers(tmp_path):
    class Response:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            pass

    class RunningProcess:
        def poll(self):
            return None

    log = tmp_path / "uvicorn.log"
    log.write_text("INFO: Application startup started\n")
    namespace = helper_namespace(server=RunningProcess(), log_path=log, urlopen=lambda *_a, **_kw: Response())
    status = namespace["runtime_status"]()
    assert status["http"] == "ACTIVE"
    assert status["worker_model"] == "NOT_READY_OR_UNKNOWN"


def test_stop_runtime_is_idempotent_and_cleans_up_process_group_after_timeout(tmp_path):
    killed_groups = []

    class TimeoutExpired(Exception):
        pass

    class Process:
        pid = 4321

        def __init__(self):
            self.terminated = False
            self.wait_calls = 0

        def poll(self):
            return None if not self.terminated else -signal.SIGTERM

        def terminate(self):
            self.terminated = True

        def wait(self, timeout):
            self.wait_calls += 1
            if self.wait_calls == 1:
                raise TimeoutExpired()
            return -signal.SIGKILL

    process = Process()
    log_file = open(tmp_path / "uvicorn.log", "w", encoding="utf-8")
    namespace = helper_namespace(
        server=process,
        log_file=log_file,
        os=SimpleNamespace(killpg=lambda group, sig: killed_groups.append((group, sig)), getpgid=lambda _pid: 4321),
        subprocess=type("Subprocess", (), {"TimeoutExpired": TimeoutExpired})(),
        time=SimpleNamespace(sleep=lambda _seconds: None),
    )
    namespace["stop_runtime"]()
    namespace["stop_runtime"]()
    assert killed_groups and killed_groups[0][0] == 4321
    assert namespace["server"] is None
    assert log_file.closed


def test_recent_logs_only_show_allowlisted_runtime_lines_and_never_raw_payloads(tmp_path):
    token = "test-secret-value"
    log = tmp_path / "uvicorn.log"
    log.write_text(
        f"INFO: AI model loaded in 1.0 seconds\nraw prompt: private prompt\nresponse: private response\n{token}\n",
        encoding="utf-8",
    )
    namespace = helper_namespace(log_path=log, runtime_token=token)
    output = namespace["recent_logs"]()
    assert token not in output
    assert "AI model loaded in 1.0 seconds" in output
    assert "private prompt" not in output
    assert "private response" not in output
    assert "[REDACTED]" not in output


def test_status_after_stop_does_not_expose_raw_log_lines_or_cleared_token(tmp_path, capsys):
    token = "stopped-secret"
    log = tmp_path / "uvicorn.log"
    log.write_text(f"INFO: Application startup complete\n{token}\nraw prompt: private\n")

    class StoppedProcess:
        pid = 4321

        def poll(self):
            return -signal.SIGTERM

        def wait(self, timeout):
            return -signal.SIGTERM

    namespace = helper_namespace(
        server=StoppedProcess(), log_path=log, runtime_token=token,
        log_file=None,
        os=SimpleNamespace(killpg=lambda *_args: None),
        subprocess=type("Subprocess", (), {"TimeoutExpired": subprocess.TimeoutExpired})(),
        time=SimpleNamespace(sleep=lambda _seconds: None),
        urlopen=lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("stopped process must not query HTTP")),
    )
    namespace["stop_runtime"]()
    namespace["runtime_status"]()
    output = capsys.readouterr().out
    assert token not in output
    assert "raw prompt" not in output
    assert "private" not in output


def test_installed_dependencies_and_torch_are_verified_after_install(monkeypatch):
    initial = {"fastapi": "0.162.0", "torch": "2.11.0+cu130"}
    after = {**initial, "uvicorn": "0.54.0", "jsonschema": "4.26.0", "transformers": "5.21.0", "accelerate": "1.15.0", "lm-format-enforcer": "0.11.3"}
    versions = iter([initial, after])
    calls = []

    class FakeSubprocess:
        STDOUT = subprocess.STDOUT
        CalledProcessError = subprocess.CalledProcessError

        @staticmethod
        def run(args, **_kwargs):
            calls.append(args)

    namespace = helper_namespace(subprocess=FakeSubprocess, _installed_package_versions=lambda: next(versions))
    namespace["install_missing_runtime_dependencies"]()
    assert len(calls) == 2
    assert "--dry-run" in calls[0]
    assert "--dry-run" not in calls[1]


def test_installer_preserves_compatible_colab_fastapi_and_uvicorn_versions():
    initial = {"fastapi": "0.116.1", "uvicorn": "0.35.0", "torch": "2.11.0+cu130"}
    after = {
        **initial, "jsonschema": "4.26.0", "transformers": "5.21.0",
        "accelerate": "1.15.0", "lm-format-enforcer": "0.11.3",
    }
    versions = iter([initial, after])
    calls = []

    class FakeSubprocess:
        STDOUT = subprocess.STDOUT
        CalledProcessError = subprocess.CalledProcessError

        @staticmethod
        def run(args, **_kwargs):
            calls.append(args)

    namespace = helper_namespace(subprocess=FakeSubprocess, _installed_package_versions=lambda: next(versions))
    result = namespace["install_missing_runtime_dependencies"]()
    assert result["fastapi"] == "0.116.1"
    assert result["uvicorn"] == "0.35.0"
    assert all("fastapi==0.162.0" not in call and "uvicorn==0.54.0" not in call for call in calls)


def test_dependency_installer_fails_if_post_install_versions_changed(monkeypatch):
    initial = {"fastapi": "0.162.0", "torch": "2.11.0+cu130"}
    after = {**initial, "uvicorn": "0.54.0", "jsonschema": "4.26.0", "transformers": "5.21.0", "accelerate": "1.15.0", "lm-format-enforcer": "0.11.3"}
    after["fastapi"] = "0.170.0"
    versions = iter([initial, after])

    class FakeSubprocess:
        STDOUT = subprocess.STDOUT
        CalledProcessError = subprocess.CalledProcessError

        @staticmethod
        def run(_args, **_kwargs):
            pass

    namespace = helper_namespace(subprocess=FakeSubprocess, _installed_package_versions=lambda: next(versions))
    try:
        namespace["install_missing_runtime_dependencies"]()
    except RuntimeError:
        pass
    else:
        raise AssertionError("post-install changes to existing pins must fail")


def test_status_reports_not_ready_when_openapi_is_not_available(tmp_path):
    class Response:
        status = 503

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            pass

    class RunningProcess:
        def poll(self):
            return None

    log = tmp_path / "uvicorn.log"
    log.write_text("INFO: Application startup complete\nINFO: AI model loaded in 8.125 seconds\n")
    namespace = helper_namespace(server=RunningProcess(), log_path=log, urlopen=lambda *_a, **_kw: Response())
    status = namespace["runtime_status"]()
    assert status["http"] == "NOT_AVAILABLE"
    assert status["worker_model"] == "READY_AT_STARTUP"


def test_notebook_pins_verified_model_and_keeps_runtime_local_without_test_or_app_setup():
    joined = "\n".join(code_sources())
    assert "Qwen/Qwen2.5-1.5B-Instruct" in joined
    assert "989aa7980e4cf806f80c7fef2b1adb7bc71aa306" in joined
    assert "AI_RUNTIME_LOAD_MODE" in joined and "fp16" in joined
    assert "127.0.0.1" in joined
    for forbidden in ("lite_smoke", "Full Benchmark", "pnpm", "prisma generate", "pip-compile", "RUN_LIVE_NESTJS_SMOKE", "cloudflared", "ngrok", "--host 0.0.0.0", "POST /v1/infer"):
        assert forbidden not in joined
