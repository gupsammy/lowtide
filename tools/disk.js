// The sample kit read from disk, for Node (tests and tools). The browser fetches the same files instead.
import { readFile } from 'node:fs/promises';
import { loadBank } from '../src/sampler.js';

export const diskBank = () => loadBank(async (file) => {
  const b = await readFile(new URL(`../samples/${file}`, import.meta.url));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
});
