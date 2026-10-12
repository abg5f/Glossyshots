// Pas de console en release sous Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    clicadre_lib::run()
}
