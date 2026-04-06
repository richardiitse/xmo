import type { ToolAdapter } from './ToolAdapter.js'
import { claudeCodeAdapter } from './ClaudeCodeAdapter.js'
import { codexAdapter } from './CodexAdapter.js'
import { openClawAdapter } from './OpenClawAdapter.js'

export type AdapterName = 'claude-code' | 'codex' | 'openclaw'

export const allAdapters: ToolAdapter[] = [
  claudeCodeAdapter,
  codexAdapter,
  openClawAdapter,
]

export function isAdapterName(value: string): value is AdapterName {
  return value === 'claude-code' || value === 'codex' || value === 'openclaw'
}

export function getAdapterByName(name: AdapterName): ToolAdapter | undefined {
  return allAdapters.find(adapter => adapter.name === name)
}
