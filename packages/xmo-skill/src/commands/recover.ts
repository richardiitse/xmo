import { scanProject, generateSearchKeywords } from '@xmo/core'
import { queryEntities } from './query.js'
import { formatMemoryBlock } from '@xmo/core'

/**
 * /xmo-recover command
 *
 * Loads relevant memories from KG into context based on current project.
 *
 * Flow:
 * 1. Scan current directory for project metadata (package.json)
 * 2. Generate search keywords from project metadata
 * 3. Query KG for relevant entities
 * 4. Format and return results
 */
export async function runRecover(): Promise<string> {
  const cwd = process.cwd()

  // Step 1: Scan project
  const metadata = await scanProject(cwd)

  if (!metadata) {
    return [
      'No project detected in current directory.',
      '',
      'Supported project types:',
      '  - Node.js (package.json)',
      '',
      'Usage: /xmo-recover [keyword ...]',
      '  Or specify keywords manually: /xmo-recover typescript react',
    ].join('\n')
  }

  // Step 2: Generate keywords
  const keywords = generateSearchKeywords(metadata)

  if (keywords.length === 0) {
    return [
      `Project "${metadata.name}" detected but no keywords extracted.`,
      '',
      'Usage: /xmo-recover [keyword ...]',
    ].join('\n')
  }

  // Step 3: Query KG
  let entities
  try {
    entities = await queryEntities(keywords, 20)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return `Query failed: ${msg}`
  }

  if (entities.length === 0) {
    return [
      `No memories found for project "${metadata.name}".`,
      '',
      `Detected tech stack: ${metadata.techStack.join(', ') || 'none'}`,
      '',
      'Try running /xmo-extract to populate memory first.',
      'Or specify keywords manually: /xmo-recover <keyword> ...',
    ].join('\n')
  }

  // Step 4: Format results
  const block = formatMemoryBlock(entities, metadata.name, { maxEntities: 20 })

  const header = [
    `Project: ${metadata.name}`,
    `Tech stack: ${metadata.techStack.join(', ') || 'none'}`,
    `Searched: ${keywords.slice(0, 5).join(', ')}${keywords.length > 5 ? '...' : ''}`,
    '',
  ].join('\n')

  return header + block
}
