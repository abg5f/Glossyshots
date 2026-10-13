//! Icône de la zone de notification, libellés selon la langue choisie.

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Wry};

const TRAY_ID: &str = "glossyshots";

struct Labels {
    capture: &'static str,
    open: &'static str,
    quit: &'static str,
    tooltip: &'static str,
}

fn labels(lang: &str) -> Labels {
    match lang {
        "en" => Labels {
            capture: "Capture an area",
            open: "Open Glossyshots",
            quit: "Quit",
            tooltip: "Glossyshots: press Print Screen to capture",
        },
        _ => Labels {
            capture: "Capturer une zone",
            open: "Ouvrir Glossyshots",
            quit: "Quitter",
            tooltip: "Glossyshots : Impr. écran pour capturer",
        },
    }
}

fn menu(app: &AppHandle, l: &Labels) -> tauri::Result<Menu<Wry>> {
    let capture = MenuItem::with_id(app, "capture", l.capture, true, None::<&str>)?;
    let open = MenuItem::with_id(app, "open", l.open, true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", l.quit, true, None::<&str>)?;
    Menu::with_items(app, &[&capture, &open, &sep, &quit])
}

pub fn build(app: &AppHandle) -> tauri::Result<()> {
    let l = labels(&crate::settings::language(app));
    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip(l.tooltip)
        .menu(&menu(app, &l)?)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "capture" => crate::start_capture(app),
            "open" => crate::show_editor(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                crate::start_capture(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

pub fn refresh(app: &AppHandle) {
    let l = labels(&crate::settings::language(app));
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        if let Ok(m) = menu(app, &l) {
            let _ = tray.set_menu(Some(m));
        }
        let _ = tray.set_tooltip(Some(l.tooltip));
    }
}
