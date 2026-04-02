import { readJSONL, EMBEDDINGS_DIR } from '@xmo/core'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'

interface EmbeddingCache {
  [key: string]: number[]
}

export async function getEmbedding(text: string): Promise<number[]> {
  const cacheFile = resolve(EMBEDDINGS_DIR, 'cache.json')
  const cache = await readJSONL<EmbeddingCache>(cacheFile).then(rows => rows[0] || {})

  const hash = simpleHash(text)

  if (cache[hash]) {
    return cache[hash]
  }

  const embedding = generatePseudoEmbedding(hash)
  cache[hash] = embedding
  await writeFile(cacheFile, JSON.stringify(cache))

  return embedding
}

function simpleHash(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

function generatePseudoEmbedding(hash: string): number[] {
  const seed = parseInt(hash, 36) || 1
  const embedding: number[] = []
  for (let i = 0; i < 128; i++) {
    const value = Math.sin(seed * (i + 1)) * 100
    embedding.push(value)
  }
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
  return embedding.map(v => v / magnitude)
}

export async function cosineSimilarity(a: number[], b: number[]): Promise<number> {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
