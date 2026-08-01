"""Tests for desktop-only backend startup configuration."""

import pytest
import psutil

from core.desktop_runtime import (
    configured_startup_nonce,
    resolve_server_port,
    resolve_server_host,
    startup_nonce_matches,
)
from core.runtime import (
    is_parent_process_alive,
    monitor_parent,
    resolve_parent_pid,
)


def test_desktop_port_has_precedence_over_standard_port():
    environ = {"QURIODB_DESKTOP_PORT": "43123", "PORT": "5000"}
    assert resolve_server_port(environ) == 43123


def test_standard_port_remains_available_for_browser_development():
    assert resolve_server_port({"PORT": "5100"}) == 5100


def test_server_port_defaults_to_5000():
    assert resolve_server_port({}) == 5000


def test_desktop_host_ignores_inherited_wildcard_host():
    environ = {"QURIODB_DESKTOP_PORT": "43123", "HOST": "0.0.0.0"}
    assert resolve_server_host(environ) == "127.0.0.1"


def test_browser_host_override_remains_available():
    assert resolve_server_host({"HOST": "192.0.2.10"}) == "192.0.2.10"


def test_server_host_defaults_to_loopback():
    assert resolve_server_host({}) == "127.0.0.1"


@pytest.mark.parametrize("value", ["0", "65536", "not-a-port", ""])
def test_invalid_desktop_port_fails_clearly(value):
    with pytest.raises(ValueError, match="QURIODB_DESKTOP_PORT"):
        resolve_server_port({"QURIODB_DESKTOP_PORT": value})


def test_startup_nonce_is_trimmed_and_compared():
    expected = configured_startup_nonce({"QURIODB_STARTUP_NONCE": "  launch-secret  "})
    assert expected == "launch-secret"
    assert startup_nonce_matches("launch-secret", expected)
    assert not startup_nonce_matches("wrong", expected)
    assert not startup_nonce_matches(None, expected)


@pytest.mark.parametrize(
    ("environment", "fallback_pid", "expected_pid"),
    [
        ({"QURIODB_DESKTOP_PARENT_PID": "1234"}, 99, 1234),
        ({}, 99, 99),
        ({}, 1, None),
    ],
)
def test_resolve_parent_pid_prefers_explicit_pid_and_falls_back_to_getppid(
    environment, fallback_pid, expected_pid
):
    assert resolve_parent_pid(environment, lambda: fallback_pid) == expected_pid


@pytest.mark.parametrize("value", ["", "-1", "0", "not-a-pid", "1.5", None, 1234])
def test_invalid_explicit_parent_pid_fails_clearly(value):
    with pytest.raises(ValueError, match="QURIODB_DESKTOP_PARENT_PID"):
        resolve_parent_pid({"QURIODB_DESKTOP_PARENT_PID": value}, lambda: 4321)


class FakeProcess:
    def __init__(self, *, running=True, status=psutil.STATUS_SLEEPING, create_time=10.0):
        self.running = running
        self.process_status = status
        self.process_create_time = create_time

    def is_running(self):
        return self.running

    def status(self):
        return self.process_status

    def create_time(self):
        return self.process_create_time


def test_parent_liveness_requires_running_process_with_matching_create_time():
    assert is_parent_process_alive(FakeProcess(), 10.0)
    assert not is_parent_process_alive(FakeProcess(running=False), 10.0)
    assert not is_parent_process_alive(
        FakeProcess(create_time=11.0), 10.0
    )


def test_parent_liveness_rejects_zombie_process():
    assert not is_parent_process_alive(
        FakeProcess(status=psutil.STATUS_ZOMBIE), 10.0
    )


@pytest.mark.parametrize("error", [psutil.NoSuchProcess(123), psutil.ZombieProcess(123)])
def test_parent_liveness_fails_safe_for_missing_process_errors(error):
    class ErrorProcess(FakeProcess):
        def is_running(self):
            raise error

    assert not is_parent_process_alive(ErrorProcess(), 10.0)


class ExitCalled(Exception):
    def __init__(self, code):
        self.code = code


def injected_exit(code):
    raise ExitCalled(code)


def monitor_with_exit(environment, **kwargs):
    with pytest.raises(ExitCalled) as error:
        monitor_parent(
            environ=environment,
            exit_fn=injected_exit,
            **kwargs,
        )
    return error.value.code


@pytest.mark.parametrize("value", ["", "-1", "0", "not-a-pid", None, 1234])
def test_malformed_explicit_parent_pid_exits_fatally_without_fallback(value):
    fallback_calls = []
    process_calls = []

    code = monitor_with_exit(
        {"QURIODB_DESKTOP_PARENT_PID": value},
        getppid=lambda: fallback_calls.append(True) or 4321,
        process_factory=lambda pid: process_calls.append(pid),
    )

    assert code != 0
    assert fallback_calls == []
    assert process_calls == []


class MonitorProcess(FakeProcess):
    def __init__(self, *, error=None, **kwargs):
        super().__init__(**kwargs)
        self.error = error

    def create_time(self):
        if self.error and self.error[0] == "create_time":
            raise self.error[1]
        return super().create_time()

    def name(self):
        if self.error and self.error[0] == "name":
            raise self.error[1]
        return "tauri"

    def status(self):
        if self.error and self.error[0] == "status":
            raise self.error[1]
        return super().status()


class ReusedProcess(MonitorProcess):
    def __init__(self):
        super().__init__()
        self.create_time_calls = 0

    def create_time(self):
        self.create_time_calls += 1
        return 10.0 if self.create_time_calls == 1 else 11.0

@pytest.mark.parametrize(
    "process_factory",
    [
        lambda pid: (_ for _ in ()).throw(RuntimeError("process lookup failed")),
        lambda pid: MonitorProcess(error=("create_time", RuntimeError("ctime failed"))),
        lambda pid: MonitorProcess(error=("name", RuntimeError("name failed"))),
    ],
)
def test_explicit_parent_initialization_errors_exit_fatally(process_factory):
    assert (
        monitor_with_exit(
            {"QURIODB_DESKTOP_PARENT_PID": "4321"},
            process_factory=process_factory,
        )
        != 0
    )


def test_unexpected_monitor_exception_exits_fatally():
    assert (
        monitor_with_exit(
            {"QURIODB_DESKTOP_PARENT_PID": "4321"},
            process_factory=lambda pid: MonitorProcess(
                error=("status", RuntimeError("monitor failed"))
            ),
        )
        != 0
    )


def test_unexpected_sleep_exception_exits_fatally():
    assert (
        monitor_with_exit(
            {"QURIODB_DESKTOP_PARENT_PID": "4321"},
            process_factory=lambda pid: MonitorProcess(),
            sleep_fn=lambda seconds: (_ for _ in ()).throw(RuntimeError("sleep failed")),
        )
        != 0
    )


@pytest.mark.parametrize(
    "process",
    [
        MonitorProcess(running=False),
        MonitorProcess(status=psutil.STATUS_ZOMBIE),
        ReusedProcess(),
    ],
)
def test_known_liveness_failure_exits_normally(process):
    assert (
        monitor_with_exit(
            {"QURIODB_DESKTOP_PARENT_PID": "4321"},
            process_factory=lambda pid: process,
        )
        == 0
    )


def test_access_denied_during_liveness_inspection_exits_fatally():
    assert (
        monitor_with_exit(
            {"QURIODB_DESKTOP_PARENT_PID": "4321"},
            process_factory=lambda pid: MonitorProcess(
                error=("status", psutil.AccessDenied(4321))
            ),
        )
        == 1
    )


def test_orphaned_standalone_process_does_not_exit():
    process_calls = []
    monitor_parent(
        environ={},
        getppid=lambda: 1,
        process_factory=lambda pid: process_calls.append(pid),
        exit_fn=injected_exit,
    )
    assert process_calls == []


def test_standalone_parent_is_still_monitored():
    process_calls = []
    assert (
        monitor_with_exit(
            {},
            getppid=lambda: 4321,
            process_factory=lambda pid: process_calls.append(pid) or MonitorProcess(running=False),
        )
        == 0
    )
    assert process_calls == [4321]
