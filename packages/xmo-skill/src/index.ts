import { runExtract } from './commands/extract.js'
import { runQuery } from './commands/query.js'
import { runDream, runStats } from './commands/dream.js'

export const SKILL_NAME = 'xmo'

export const COMMANDS = {
  main: '/xmo',
  dream: '/xmo-dream',
  stats: '/xmo-stats',
  recover: '/xmo-recover',
  extract: '/xmo-extract',
} as const

export async function handleXmoCommand(args: string): Promise<string> {
  const parts = args.trim().split(/\s+/)
  const subcommand = parts[0] || 'status'
  const rest = parts.slice(1)

  switch (subcommand) {
    case 'status':
    case '':
      return getStatus()
    case 'dream':
      return runDream()
    case 'stats':
      return runStats()
    case 'recover':
      return 'Use /xmo-recover to load memory into context'
    case 'extract':
      return runExtract()
    case 'query':
      // /xmo query keyword1 keyword2 ...
      return runQuery(rest, 20)
    default:
      return getStatus()
  }
}

export function getHelp(): string {
  return `
XMO - Extended Memory Optimization

/xmo - Status overview
/xmo-extract - Extract entities from current session
/xmo-query <keyword> [<keyword>...] - Search memory
/xmo-dream - Trigger consolidation
/xmo-stats - View statistics
/xmo-recover - Load memory into context
`
}

function getStatus(): string {
  return `
XMO - Extended Memory Optimization
Run /xmo-extract to extract entities from your session.
Run /xmo-query <keyword> to search memory.
Run /xmo-stats to view KG statistics.
`
}
