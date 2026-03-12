import typing
if not hasattr(typing, 'get_args'):
    import typing_extensions
    typing.get_args = typing_extensions.get_args

import webview
import subprocess
import os
import sys
import time
import requests
import http.server
import socketserver
import threading

# Cổng cho Frontend và Backend
FRONTEND_PORT = 5005
BACKEND_PORT = 5000

def start_frontend_server(path):
    os.chdir(path)
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", FRONTEND_PORT), handler) as httpd:
        print(f"Frontend server at port {FRONTEND_PORT}")
        httpd.serve_forever()

def start_backend():
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))
    
    backend_path = os.path.join(base_path, "api.exe")
    
    # Khởi động Backend
    env = os.environ.copy()
    process = subprocess.Popen([backend_path], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return process

if __name__ == '__main__':
    # 1. Xác định đường dẫn Frontend
    if getattr(sys, 'frozen', False):
        frontend_dir = os.path.join(sys._MEIPASS, "out")
    else:
        frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "apps/web/out")
    
    # 2. Chạy Frontend Server trong luồng riêng
    t = threading.Thread(target=start_frontend_server, args=(frontend_dir,))
    t.daemon = True
    t.start()

    # 3. Chạy Backend
    backend_process = start_backend()
    
    # 4. Tạo cửa sổ ứng dụng trỏ vào Local Server
    window = webview.create_window('DBMS Platform', f'http://localhost:{FRONTEND_PORT}', width=1280, height=800)
    
    webview.start()
    
    # 5. Dọn dẹp
    backend_process.terminate()
