use std::process::Command;
use std::os::windows::process::CommandExt;
use tauri::Manager;
use std::env;
use std::fs;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let handle = app.handle().clone();
      
      tauri::async_runtime::spawn(async move {
        // Chung ta se thu ca 2 ten file: ten goc va ten sau khi bi bundle strip suffix
        let sidecar_names = vec!["api.exe", "api-x86_64-pc-windows-gnu.exe"];
        
        let curr_executable = env::current_exe().unwrap_or_default();
        let curr_dir = curr_executable.parent().unwrap_or(&std::path::Path::new("."));
        let res_dir = handle.path().resource_dir().unwrap_or_default();

        let mut paths_to_try = Vec::new();
        
        for name in sidecar_names {
            paths_to_try.push(curr_dir.join(name));
            paths_to_try.push(res_dir.join(name));
            paths_to_try.push(res_dir.join("bin").join(name));
            paths_to_try.push(res_dir.join("_up_").join("bin").join(name));
        }

        let mut started = false;
        for path in paths_to_try {
            if path.exists() {
                println!("[FOUND] Dang khoi chay: {:?}", path);
                let mut cmd = Command::new(&path);
                
                // Match cmd.spawn() but let it show the window for debugging
                // #[cfg(windows)]
                // cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

                match cmd.spawn() {
                    Ok(_) => {
                        println!("[SUCCESS] Backend da duoc kich hoat.");
                        started = true;
                        break;
                    }
                    Err(e) => println!("[ERROR] Spawn error: {}", e),
                }
            }
        }

        if !started {
            println!("!!! KHONG TIM THAY BACKEND - VUI LONG KIEM TRA FILE API.EXE !!!");
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
