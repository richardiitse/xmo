export const SKILL_NAME = 'xmo'

export const COMMANDS = {
  main: '/xmo',
  dream: '/xmo-dream',
  stats: '/xmo-stats',
  recover: '/xmo-recover',
  extract: '/xmo-extract',
} as const

export function getHelp(): string {
  return `
XMO - Extended Memory Optimization

${Object.values(COMMANDS).join('\n')}

Use /xmo for status overview.
`
}
