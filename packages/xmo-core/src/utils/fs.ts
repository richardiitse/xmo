import { resolve } from 'path';
import { mkdir, readFile, writeFile, access } from 'fs/promises';

// Directory paths
export const XMO_DIR = resolve(process.env.HOME!, '.xmo');
export const KG_DIR = resolve(XMO_DIR, 'kg');
export const KG_FILE = resolve(KG_DIR, 'entities.jsonl');
export const LOCK_FILE = resolve(XMO_DIR, 'dream.lock');

// Ensure XMO directory exists
export async function ensureXmoDir(): Promise<void> {
  await mkdir(XMO_DIR, { recursive: true });
  await mkdir(KG_DIR, { recursive: true });
}

// Read JSONL file and return array of parsed objects
export async function readJSONL<T>(filePath: string): Promise<T[]> {
  try {
    await access(filePath);
  } catch {
    // File doesn't exist yet, return empty array
    return [];
  }

  const content = await readFile(filePath, 'utf-8');
  if (!content.trim()) {
    return [];
  }

  const parseErrors: { line: number; error: string }[] = []
  const result: T[] = []

  content.split('\n').forEach((line, idx) => {
    if (!line.trim()) return
    try {
      result.push(JSON.parse(line) as T)
    } catch {
      parseErrors.push({ line: idx + 1, error: 'JSON parse failed' })
    }
  })

  if (parseErrors.length > 0) {
    const errorFile = filePath.replace(/\.jsonl$/, '.parse-errors.log')
    const timestamp = new Date().toISOString()
    const logLines = parseErrors
      .map(e => `[${timestamp}] line ${e.line}: ${e.error}`)
      .join('\n') + '\n'
    // Best-effort error logging (do not throw if this fails)
    writeFile(errorFile, logLines, { flag: 'a' }).catch(() => {})
  }

  return result;
}

// Append data to a JSONL file
export async function appendJSONL(
  filePath: string,
  data: unknown
): Promise<void> {
  const line = JSON.stringify(data) + '\n';
  await writeFile(filePath, line, { flag: 'a' });
}
