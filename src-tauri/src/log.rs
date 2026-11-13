//! Journal minimal dans `<app_log_dir>/glossyshots.log`.
//!
//! En version installée, la console n'existe pas : sans ce fichier, un raccourci perdu
//! ou une fenêtre qui ne répond plus ne laisse aucune trace. Le fichier reste local
//! (aucun envoi) et tourne à 512 Ko.

use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use tauri::{AppHandle, Manager};

const MAX_BYTES: u64 = 512 * 1024;

static FILE: OnceLock<Mutex<PathBuf>> = OnceLock::new();

pub fn init(app: &AppHandle) {
    let Ok(dir) = app.path().app_log_dir() else { return };
    if std::fs::create_dir_all(&dir).is_err() {
        return;
    }
    let path = dir.join("glossyshots.log");
    if std::fs::metadata(&path).is_ok_and(|m| m.len() > MAX_BYTES) {
        let _ = std::fs::rename(&path, dir.join("glossyshots.old.log"));
    }
    let _ = FILE.set(Mutex::new(path));
}

pub fn write(message: &str) {
    eprintln!("[glossyshots] {message}");
    let Some(path) = FILE.get() else { return };
    let path = path.lock().unwrap();
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&*path) {
        let _ = writeln!(f, "{} {message}", timestamp());
    }
}

/// Date et heure UTC, `AAAA-MM-JJ HH:MM:SS`, sans dépendance supplémentaire.
fn timestamp() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let (days, rem) = (secs.div_euclid(86_400), secs.rem_euclid(86_400));
    // Algorithme « civil from days » (H. Hinnant).
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!(
        "{y:04}-{m:02}-{d:02} {:02}:{:02}:{:02}Z",
        rem / 3600,
        rem % 3600 / 60,
        rem % 60
    )
}

macro_rules! log {
    ($($arg:tt)*) => { $crate::log::write(&format!($($arg)*)) };
}
pub(crate) use log;
