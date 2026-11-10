import fs from 'node:fs/promises';

export default async function globalTeardown() {
  await fs.rm('uploads-test', { recursive: true, force: true });
}
