/**
 * Simulateur du cœur Rust pour prévisualiser l'interface dans un navigateur
 * (tests visuels, captures du README, vidéo). Jamais inclus dans le build.
 * Usage : npm run dev puis http://localhost:1420/dev/editor.html
 */
import { fakeScreenshot } from "./fake-screenshot";

type Handler = (args: Record<string, unknown>) => unknown;

const params = new URLSearchParams(location.search);
const lang = params.get("lang") ?? "fr";

function wire(img: ImageData): ArrayBuffer {
  const buf = new ArrayBuffer(8 + img.data.length);
  const v = new DataView(buf);
  v.setUint32(0, img.width, true);
  v.setUint32(4, img.height, true);
  new Uint8Array(buf, 8).set(img.data);
  return buf;
}

const callbacks = new Map<number, (p: unknown) => void>();
let nextId = 1;
const shot = fakeScreenshot(lang === "en" ? "en" : "fr");

const handlers: Record<string, Handler> = {
  get_settings: () => ({ language: lang }),
  set_language: () => null,
  get_system_state: () => ({
    platform: "windows",
    printscreenRegistered: true,
    snippingOwnsPrintscreen: params.has("snip"),
    autostart: false,
    fallbackShortcut: "Ctrl+Shift+X",
  }),
  get_crop: () => {
    if (params.has("empty")) throw "aucune capture";
    return wire(shot);
  },
  get_capture: () => wire(shot),
  copy_image: () => {
    copies++;
    console.log("[mock] copy_image");
  },
  save_png: () => String.raw`C:\Users\demo\Pictures\Glossyshots\Glossyshots.png`,
  "plugin:event|listen": (args) => {
    listeners.set(args.event as string, args.handler as number);
    return nextId++;
  },
  "plugin:event|unlisten": () => null,
};

/** Événements écoutés par la page (nom → callback) et compteur de copies, pour les tests. */
const listeners = new Map<string, number>();
let copies = 0;
(window as any).__mock = {
  /** Simule un événement émis par le cœur natif, ex. `__mock.emit("editor:capture")`. */
  emit(event: string, payload: unknown = null) {
    const id = listeners.get(event);
    if (id !== undefined) callbacks.get(id)?.({ event, id, payload });
  },
  get copies() {
    return copies;
  },
};

(window as any).__TAURI_INTERNALS__ = {
  metadata: { currentWindow: { label: "editor" }, currentWebview: { windowLabel: "editor", label: "editor" } },
  transformCallback(cb: (p: unknown) => void) {
    const id = nextId++;
    callbacks.set(id, cb);
    return id;
  },
  unregisterCallback(id: number) {
    callbacks.delete(id);
  },
  async invoke(cmd: string, args: Record<string, unknown> = {}) {
    const h = handlers[cmd];
    if (!h) {
      console.debug("[mock] ignoré :", cmd);
      return null;
    }
    return h(args);
  },
  convertFileSrc: (p: string) => p,
};
(window as any).__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} };
