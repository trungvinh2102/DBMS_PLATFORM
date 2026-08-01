"""
runtime.py

Runtime helpers for the desktop sidecar process.
"""

import logging
import os
import time

import psutil

DESKTOP_PARENT_PID_ENV = "QURIODB_DESKTOP_PARENT_PID"


def resolve_parent_pid(environ=None, getppid=os.getppid):
    """Resolve the desktop owner PID, falling back to the immediate parent."""
    environment = os.environ if environ is None else environ
    if DESKTOP_PARENT_PID_ENV in environment:
        raw_parent_id = environment[DESKTOP_PARENT_PID_ENV]
        if not isinstance(raw_parent_id, str):
            raise ValueError(f"{DESKTOP_PARENT_PID_ENV} must be a string PID")
        try:
            parent_id = int(raw_parent_id.strip())
        except ValueError:
            raise ValueError(f"{DESKTOP_PARENT_PID_ENV} must be a valid PID") from None
        if parent_id <= 1:
            raise ValueError(f"{DESKTOP_PARENT_PID_ENV} must be greater than 1")
        return parent_id

    parent_id = getppid()
    return parent_id if parent_id > 1 else None


def is_parent_process_alive(parent, expected_create_time):
    """Return whether the observed PID is still the same live process."""
    try:
        if parent.status() == psutil.STATUS_ZOMBIE:
            return False
        if not parent.is_running():
            return False
        return parent.create_time() == expected_create_time
    except (psutil.NoSuchProcess, psutil.ZombieProcess):
        return False


def monitor_parent(
    environ=None,
    getppid=os.getppid,
    process_factory=psutil.Process,
    exit_fn=os._exit,
    sleep_fn=time.sleep,
) -> None:
    """
    Monitor the parent Tauri process and exit the backend if it disappears.
    """
    try:
        parent_id = resolve_parent_pid(environ, getppid)
    except Exception:
        logging.error("Backend: Invalid desktop parent PID configuration. Exiting.")
        exit_fn(1)
        return

    if parent_id is None:
        logging.info("Backend: Started as orphan or adopted by init. Not monitoring.")
        return

    try:
        parent = process_factory(parent_id)
        expected_create_time = parent.create_time()
        logging.info("Backend: Monitoring parent process: %s (PID: %s)", parent.name(), parent_id)
    except Exception:
        logging.error("Backend: Failed to initialize parent monitor for PID %s. Exiting.", parent_id)
        exit_fn(1)
        return

    while True:
        try:
            alive = is_parent_process_alive(parent, expected_create_time)
        except Exception:
            logging.error("Backend: Parent monitor failed for PID %s. Exiting.", parent_id)
            exit_fn(1)
            return
        if not alive:
            logging.warning("Backend: Parent process (Tauri) has exited. Shutting down...")
            exit_fn(0)
            return
        try:
            sleep_fn(2)
        except Exception:
            logging.error("Backend: Parent monitor failed for PID %s. Exiting.", parent_id)
            exit_fn(1)
            return
