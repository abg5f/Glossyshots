import { invoke } from "@tauri-apps/api/core";

/** Décode le format binaire du natif : largeur u32 LE, hauteur u32 LE, pixels RGBA. */
export async function fetchShot(command: "get_capture" | "get_crop"): Promise<ImageBitmap> {
  const buf = await invoke<ArrayBuffer>(command);
  const view = new DataView(buf);
  const width = view.getUint32(0, true);
  const height = view.getUint32(4, true);
  const pixels = new Uint8ClampedArray(buf, 8, width * height * 4);
  return createImageBitmap(new ImageData(pixels, width, height));
}

export function copyImage(canvas: HTMLCanvasElement): Promise<void> {
  const ctx = canvas.getContext("2d")!;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return invoke("copy_image", new Uint8Array(data.buffer), {
    headers: { "x-width": String(canvas.width), "x-height": String(canvas.height) },
  });
}

export async function savePng(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG"))), "image/png"),
  );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return invoke<string>("save_png", bytes, { headers: { "x-filename": fileName() } });
}

function fileName(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `Glossyshots_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.png`;
}

export interface SystemState {
  platform: string;
  printscreenRegistered: boolean;
  snippingOwnsPrintscreen: boolean | null;
  autostart: boolean;
  fallbackShortcut: string;
}
