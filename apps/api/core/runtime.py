"""
runtime.py

Runtime helpers for the desktop sidecar process.
"""

import logging
import os
import time

import psutil


def monitor_parent() -> None:
    """
    Monitor the parent Tauri process and exit the backend if it disappears.
    """
    try:
        parent_id = os.getppid()
        if parent_id <= 1:
            logging.info("Backend: Started as orphan or adopted by init. Not monitoring.")
            return

        parent = psutil.Process(parent_id)
        logging.info("Backend: Monitoring parent process: %s (PID: %s)", parent.name(), parent_id)

        while True:
            if not parent.is_running():
                logging.warning("Backend: Parent process (Tauri) has exited. Shutting down...")
                os._exit(0)
            time.sleep(2)
    except Exception as exc:
        logging.error("Backend: Error in parent monitor: %s", exc)
