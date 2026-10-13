//! Préférences persistées (langue) et état système (Impr. écran, démarrage auto).

use std::sync::atomic::Ordering;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_autostart::ManagerExt;

use crate::AppState;

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// `"fr"` ou `"en"`. `None` tant que le front n'a pas détecté la langue du système.
    pub language: Option<String>,
}

pub struct SettingsStore(pub Mutex<Settings>);

fn file(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("settings.json"))
}

/// Charge les préférences dans l'état géré. Renvoie `true` au premier lancement.
pub fn load(app: &AppHandle) -> bool {
    let existing = file(app)
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str::<Settings>(&s).ok());
    let first_run = existing.is_none();
    app.manage(SettingsStore(Mutex::new(existing.unwrap_or_default())));
    first_run
}

fn persist(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let path = file(app).ok_or("dossier de configuration introuvable")?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

pub fn language(app: &AppHandle) -> String {
    app.state::<SettingsStore>()
        .0
        .lock()
        .unwrap()
        .language
        .clone()
        .unwrap_or_else(|| "fr".into())
}

#[tauri::command]
pub fn get_settings(store: tauri::State<'_, SettingsStore>) -> Settings {
    store.0.lock().unwrap().clone()
}

#[tauri::command]
pub fn set_language(app: AppHandle, language: String) -> Result<(), String> {
    if language != "fr" && language != "en" {
        return Err("langue non prise en charge".into());
    }
    let snapshot = {
        let store = app.state::<SettingsStore>();
        let mut s = store.0.lock().unwrap();
        s.language = Some(language);
        s.clone()
    };
    persist(&app, &snapshot)?;
    crate::tray::refresh(&app);
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemState {
    platform: &'static str,
    /// Le raccourci Impr. écran est enregistré par Glossyshots.
    printscreen_registered: bool,
    /// Windows : la touche Impr. écran est réservée à l'Outil Capture (`None` hors Windows).
    snipping_owns_printscreen: Option<bool>,
    autostart: bool,
    fallback_shortcut: &'static str,
}

#[tauri::command]
pub fn get_system_state(app: AppHandle) -> SystemState {
    SystemState {
        platform: std::env::consts::OS,
        printscreen_registered: app
            .state::<AppState>()
            .printscreen_registered
            .load(Ordering::SeqCst),
        snipping_owns_printscreen: snipping::owns_printscreen(),
        autostart: app.autolaunch().is_enabled().unwrap_or(false),
        fallback_shortcut: crate::shortcut::FALLBACK_LABEL,
    }
}

/// Libère (ou rend) la touche Impr. écran à l'Outil Capture de Windows.
/// N'agit que sur le profil de l'utilisateur courant (HKCU), jamais sur la machine.
#[tauri::command]
pub fn set_printscreen_for_glossyshots(app: AppHandle, enabled: bool) -> Result<SystemState, String> {
    snipping::set_owns_printscreen(!enabled)?;
    crate::shortcut::register_all(&app);
    Ok(get_system_state(app))
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> Result<SystemState, String> {
    let launcher = app.autolaunch();
    let result = if enabled { launcher.enable() } else { launcher.disable() };
    result.map_err(|e| e.to_string())?;
    Ok(get_system_state(app))
}

#[cfg(windows)]
mod snipping {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ, KEY_SET_VALUE};
    use winreg::RegKey;

    const KEY: &str = r"Control Panel\Keyboard";
    const VALUE: &str = "PrintScreenKeyForSnippingEnabled";

    pub fn owns_printscreen() -> Option<bool> {
        let key = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags(KEY, KEY_READ)
            .ok()?;
        // Valeur absente : Windows 11 réserve la touche à l'Outil Capture par défaut.
        Some(key.get_value::<u32, _>(VALUE).map(|v| v != 0).unwrap_or(true))
    }

    pub fn set_owns_printscreen(owns: bool) -> Result<(), String> {
        let key = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags(KEY, KEY_SET_VALUE)
            .map_err(|e| e.to_string())?;
        key.set_value(VALUE, &(owns as u32)).map_err(|e| e.to_string())
    }
}

#[cfg(not(windows))]
mod snipping {
    pub fn owns_printscreen() -> Option<bool> {
        None
    }
    pub fn set_owns_printscreen(_owns: bool) -> Result<(), String> {
        Ok(())
    }
}
