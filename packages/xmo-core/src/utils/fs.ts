import { resolve } from 'path';
import { mkdir, readFile, writeFile, access } from 'fs/promises';

// Directory paths
export const XMO_DIR = resolve(process.env.HOME!, '.xmo');
export const KG_DIR = resolve(XMO_DIR, 'kg');
export const EMBEDDINGS_DIR = resolve(XMO_DIR, 'embeddings');
export const LOCK_FILE = resolve(XMO_DIR, 'consolidation.lock');

// Ensure XMO directory exists
export async function ensureXmoDir(): Promise<void> {
  await mkdir(XMO_DIR, { recursive: true });
  await mkdir(KG_DIR, { recursive: true });
  await mkdir(EMBEDDINGS_DIR, { recursive: true });
}

// Read JSONL file and return array of parsed objects
export async function readJSONL<T>(filePath: string): Promise<T[]> {
  try {
    await access(filePath);
    const content = await readFile(filePath, 'utf-8');
    if (!content.trim()) {
      return [];
    }
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as T);
  } catch {
    // File doesn't exist yet, return empty array
    return [];
  }
}

// Append data to a JSONL file
export async function appendJSONL(
  filePath: string,
  data: unknown
): Promise<void> {
  const line = JSON.stringify(data) + '\n';
  await writeFile(filePath, line, { flag: 'a' });
}
