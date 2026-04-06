export async function getStatus(): Promise<string> {
  return `
XMO Status
==========
Use /xmo-stats to view detailed statistics.
Use /xmo-dream to trigger consolidation.
Use /xmo-recover to load memory.
Use /xmo-extract to extract from the newest Claude Code, Codex, or OpenClaw session.
`
}
