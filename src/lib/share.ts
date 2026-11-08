import { Timetable } from './types';

/**
 * Shared plans travel inside the link, so no server is needed.
 * Format: "z." + base64url(deflate-raw(json)) when the browser can compress,
 * otherwise "p." + base64url(json).
 */

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // Bad input makes the readable side fail; the write side must not leave an unhandled rejection.
  writer.write(bytes as BufferSource).catch(() => {});
  writer.close().catch(() => {});
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

export async function encodePlan(tt: Timetable): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(tt));
  if (typeof CompressionStream !== 'undefined') {
    try {
      return 'z.' + toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
    } catch {
      /* fall through to the plain form */
    }
  }
  return 'p.' + toBase64Url(json);
}

export async function decodePlan(token: string): Promise<Timetable | null> {
  try {
    const kind = token.slice(0, 2);
    const body = fromBase64Url(token.slice(2));
    const bytes = kind === 'z.' ? await pipe(body, new DecompressionStream('deflate-raw')) : kind === 'p.' ? body : null;
    if (!bytes) return null;
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return isTimetable(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isTimetable(value: unknown): value is Timetable {
  if (!value || typeof value !== 'object') return false;
  const t = value as Partial<Timetable>;
  return (
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    Array.isArray(t.courses) &&
    Array.isArray(t.sessions) &&
    !!t.preferences &&
    Array.isArray(t.preferences.restDays)
  );
}

export async function shareUrl(tt: Timetable): Promise<string> {
  const token = await encodePlan(tt);
  return `${window.location.origin}/shared#${token}`;
}
