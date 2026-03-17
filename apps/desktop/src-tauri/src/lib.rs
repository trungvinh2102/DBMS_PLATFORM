use std::process::Command;
use std::os::windows::process::CommandExt;
use tauri::Manager;
use std::env;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      let handle = app.handle().clone();
      
      tauri::async_runtime::spawn(async move {
        let res_dir = handle.path().resource_dir().unwrap_or_default();
        let curr_exe = env::current_exe().unwrap_or_default();
        let curr_dir = curr_exe.parent().unwrap_or(&std::path::Path::new("."));

        // --- 1. KHOI CHAY DOCKER COMPOSE ---
        if res_dir.join("docker-compose.yml").exists() {
            let mut docker_cmd = Command::new("docker");
            docker_cmd.args(["compose", "up", "-d"]);
            docker_cmd.current_dir(&res_dir);
            
            #[cfg(windows)]
            docker_cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

            let _ = docker_cmd.spawn();
        }

        // --- 2. KHOI CHAY BACKEND ---
        let sidecar_names = vec!["api.exe", "api-x86_64-pc-windows-gnu.exe", "api-x86_64-pc-windows-msvc.exe"];
        let mut paths_to_try = Vec::new();
        
        for name in sidecar_names {
            paths_to_try.push(curr_dir.join(name));
            paths_to_try.push(res_dir.join(name));
            paths_to_try.push(res_dir.join("bin").join(name));
            paths_to_try.push(res_dir.join("_up_").join("bin").join(name));
        }

        for path in paths_to_try {
            if path.exists() {
                let mut cmd = Command::new(&path);
                
                // Thiet lap thu muc lam viec de tim thay .env
                if res_dir.join(".env").exists() || res_dir.join("api.env").exists() {
                    cmd.current_dir(&res_dir);
                } else if let Some(p) = path.parent() {
                    cmd.current_dir(p);
                }

                #[cfg(windows)]
                cmd.creation_flags(0x08000000); 

                if let Ok(_) = cmd.spawn() {
                    println!("[SUCCESS] Backend da duoc kich hoat.");
                    break;
                }
            }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
