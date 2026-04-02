import { getStatus } from './commands/status.js'

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

  switch (subcommand) {
    case 'status':
      return getStatus()
    case 'dream':
      return 'Use /xmo-dream to trigger consolidation'
    case 'stats':
      return 'Use /xmo-stats to view statistics'
    case 'recover':
      return 'Use /xmo-recover to load memory'
    case 'extract':
      return 'Use /xmo-extract to manually extract entities'
    default:
      return getStatus()
  }
}

export function getHelp(): string {
  return `
XMO - Extended Memory Optimization

/xmo - Status overview
/xmo-dream - Trigger consolidation
/xmo-stats - View statistics
/xmo-recover - Recover memory
/xmo-extract - Manual extraction
`
}
