// A picture the owner picks for a bee, made ready for the engine here in the browser: cropped to the middle square,
// shrunk to 1024 px, saved as a JPEG under 600 KB (the engine's and the Hive's limit). The engine then only has to
// check it is a JPEG, so it needs no image library. Returns the JPEG as base64.
const SIZE = 1024;
const MAX_BYTES = 590 * 1024;

export async function portraitJpeg(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That is not a picture.");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error("This browser can't read that picture. Try a JPEG or PNG.");
  }
  const side = Math.min(bmp.width, bmp.height);
  const out = Math.min(SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = out;
  const ctx = canvas.getContext("2d")!;
  // JPEG has no transparency: a transparent PNG gets a dark background, not black noise.
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, out, out);
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
  bmp.close();
  for (const q of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= MAX_BYTES) return toBase64(blob);
  }
  throw new Error("That picture stays too big even shrunk. Try a simpler one.");
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
