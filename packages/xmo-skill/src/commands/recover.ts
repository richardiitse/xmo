import { scanProject, generateSearchKeywords } from '@xmo/core'
import { queryEntities } from './query.js'
import { formatMemoryBlock } from '@xmo/core'

export interface RecoverOptions {
  limit?: number | 'all'
}

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
 *
 * @param options.limit - Number of entities to return (default: 20, use 'all' for unlimited)
 */
const DEFAULT_LIMIT = 20
const UNLIMITED = 999999

export async function runRecover(options: RecoverOptions = {}): Promise<string> {
  const limit = options.limit ?? DEFAULT_LIMIT
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
      `Usage: /xmo 恢复 [数量|所有]`,
      '  Examples:',
      '    /xmo 恢复        (default 20 records)',
      '    /xmo 恢复 50     (50 records)',
      '    /xmo 恢复 所有   (all matching records)',
    ].join('\n')
  }

  // Step 2: Generate keywords
  const keywords = generateSearchKeywords(metadata)

  if (keywords.length === 0) {
    return [
      `Project "${metadata.name}" detected but no keywords extracted.`,
      '',
      `Usage: /xmo 恢复 [数量|所有]`,
    ].join('\n')
  }

  // Step 3: Query KG
  let entities
  const queryLimit = limit === 'all' ? UNLIMITED : limit
  try {
    entities = await queryEntities(keywords, queryLimit)
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
      `Usage: /xmo 恢复 [数量|所有]`,
    ].join('\n')
  }

  // Step 4: Format results
  const displayLimit = limit === 'all' ? entities.length : limit
  const block = formatMemoryBlock(entities, metadata.name, { maxEntities: displayLimit })

  const header = [
    `Project: ${metadata.name}`,
    `Tech stack: ${metadata.techStack.join(', ') || 'none'}`,
    `Searched: ${keywords.slice(0, 5).join(', ')}${keywords.length > 5 ? '...' : ''}`,
    `Showing: ${Math.min(entities.length, displayLimit)} of ${entities.length} records`,
    '',
  ].join('\n')

  return header + block
}
