import { runExtract } from './commands/extract.js'
import { runQuery } from './commands/query.js'
import { runDream, runStats } from './commands/dream.js'
import { runRecover, type RecoverOptions } from './commands/recover.js'

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
    case 'recover': {
      return runRecover(parseRecoverArgs(rest))
    }
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
/xmo-recover [数量|所有] - Load memory into context (default 20)
/xmo 恢复50条 - Load 50 records
/xmo 恢复所有 - Load all matching records
`
}

function parseRecoverArgs(args: string[]): RecoverOptions {
  const firstArg = args[0] ?? ''

  if (firstArg === '所有') {
    return { limit: 'all' }
  }

  if (firstArg) {
    const match = firstArg.match(/^(\d+)(条)?$/)
    if (match) {
      return { limit: parseInt(match[1], 10) }
    }
  }

  return {}
}

function getStatus(): string {
  return `
XMO - Extended Memory Optimization
Run /xmo-extract to extract entities from your session.
Run /xmo-query <keyword> to search memory.
Run /xmo-stats to view KG statistics.
`
}
