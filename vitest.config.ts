import { defineConfig } from 'vitest/config';
import crypto from 'crypto';

if (!(crypto as any).getRandomValues) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  crypto.getRandomValues = (typedArray: Uint8Array) => {
    const random = crypto.randomBytes(typedArray.length);
    typedArray.set(random);
    return typedArray;
  };
}

export default defineConfig({
  test: {
    globals: true,
    coverage: { provider: 'v8' }
  }
});
