export async function hashText(text: string): Promise<string> {
  // Prefer Web Crypto API when available (browsers, recent Node versions)
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuf = await globalThis.crypto.subtle.digest('SHA-256', data);
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuf));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback to Node's crypto module (synchronous but wrapped in Promise)
  // Using dynamic import so bundlers can tree-shake for browser builds.
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(text).digest('hex');
}
