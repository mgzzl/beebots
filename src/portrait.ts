// A bee portrait the owner uploads instead of having OpenAI paint one (on Setup, or later from the dashboard).
// The page shrinks the picture to a square JPEG itself and sends it as base64 in JSON, so the engine needs no image
// library: it only checks that the bytes are a JPEG of a sane size, then writes it where a painted portrait goes.
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BEES } from "./config.js";

/** Where the bees' own portraits live: next to settings.json, one `<slot>.jpg` each. */
export function imageDir(settingsPath: string): string {
  return join(dirname(settingsPath), "bee-images");
}

export function imagePath(settingsPath: string, slot: string): string | null {
  if (!(BEES as readonly string[]).includes(slot)) return null;
  const p = join(imageDir(settingsPath), `${slot}.jpg`);
  return existsSync(p) ? p : null;
}

/** Same cap as the Hive's (hive.ts), so an uploaded portrait can always go on the leaderboard too. */
export const PORTRAIT_MAX_BYTES = 600 * 1024;
/** Request body for an upload: the base64 of the biggest portrait, plus room for the rest of the JSON. */
export const UPLOAD_MAX_BODY = Math.ceil((PORTRAIT_MAX_BYTES * 4) / 3) + 4096;

/** The JPEG in a request's `jpeg` field (base64, a data: URL prefix is fine), or why it is refused. */
export function parsePortrait(v: unknown): { jpeg: Buffer } | { error: string } {
  if (typeof v !== "string" || !v) return { error: "Pick a picture first." };
  const b64 = v.replace(/^data:image\/jpeg;base64,/, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return { error: "That picture didn't arrive in one piece. Try again." };
  const jpeg = Buffer.from(b64, "base64");
  if (jpeg.length > PORTRAIT_MAX_BYTES) return { error: "That picture is over 600 KB. Try a smaller one." };
  if (jpeg.length < 128 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8 || jpeg[2] !== 0xff) return { error: "That is not a JPEG picture." };
  return { jpeg };
}

/** Writes the portrait for slot "bee1".."bee3" next to settings.json (atomic: a reader never sees half a file). */
export function writePortrait(settingsPath: string, slot: (typeof BEES)[number], jpeg: Buffer): void {
  const dir = imageDir(settingsPath);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${slot}.jpg`);
  writeFileSync(`${file}.tmp`, jpeg);
  renameSync(`${file}.tmp`, file);
}
