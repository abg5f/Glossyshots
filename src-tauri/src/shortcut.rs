//! Raccourcis globaux : Impr. écran (Windows/Linux) + un raccourci de secours.

use std::sync::atomic::Ordering;

use tauri::{AppHandle, Manager, Wry};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::AppState;

#[cfg(target_os = "macos")]
pub const FALLBACK_LABEL: &str = "Cmd+Shift+2";
#[cfg(not(target_os = "macos"))]
pub const FALLBACK_LABEL: &str = "Ctrl+Shift+X";

fn fallback() -> Shortcut {
    #[cfg(target_os = "macos")]
    return Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::Digit2);
    #[cfg(not(target_os = "macos"))]
    return Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyX);
}

pub fn plugin() -> tauri::plugin::TauriPlugin<Wry> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                crate::start_capture(app);
            }
        })
        .build()
}

/// (Ré)enregistre les raccourcis. Un échec sur Impr. écran n'est pas bloquant :
/// le raccourci de secours reste disponible et l'éditeur explique comment libérer la touche.
pub fn register_all(app: &AppHandle) {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    if let Err(err) = gs.register(fallback()) {
        eprintln!("[clicadre] raccourci de secours indisponible : {err}");
    }
    let ok = !cfg!(target_os = "macos")
        && gs.register(Shortcut::new(None, Code::PrintScreen)).is_ok();
    app.state::<AppState>()
        .printscreen_registered
        .store(ok, Ordering::SeqCst);
}
