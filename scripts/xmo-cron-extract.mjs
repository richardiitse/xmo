#!/usr/bin/env node
/**
 * XMO Session Extraction Cron Script
 *
 * This script extracts entities from all session transcripts (Claude Code, Codex, and OpenClaw).
 * Designed to be run via cron for periodic memory consolidation.
 *
 * Usage:
 *   node scripts/xmo-cron-extract.mjs [adapter]
 *   pnpm xmo:cron [adapter]
 *
 * Examples:
 *   node scripts/xmo-cron-extract.mjs           # Extract from all adapters
 *   node scripts/xmo-cron-extract.mjs codex     # Extract from Codex only
 *   node scripts/xmo-cron-extract.mjs openclaw  # Extract from OpenClaw only
 */

import { extractFromAllSessions, extractFromSessions } from '../packages/xmo-core/dist/index.js'

async function main() {
  const adapter = process.argv[2]

  console.log(`[${new Date().toISOString()}] Starting XMO session extraction...`)
  console.log(`Adapter: ${adapter ?? 'all'}`)

  const startTime = Date.now()

  let result
  if (adapter) {
    result = await extractFromSessions(adapter)
  } else {
    result = await extractFromAllSessions()
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  if (result.success) {
    console.log(`[${new Date().toISOString()}] Extraction complete!`)
    console.log(`  Sessions found: ${result.sessionsFound}`)
    console.log(`  Entities extracted: ${result.entitiesExtracted}`)
    console.log(`  Errors: ${result.errors.length}`)
    console.log(`  Duration: ${duration}s`)
    process.exit(0)
  } else {
    console.error(`[${new Date().toISOString()}] Extraction failed!`)
    console.error(`  Errors: ${result.errors.join('; ')}`)
    console.error(`  Duration: ${duration}s`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error(`[${new Date().toISOString()}] Unexpected error:`, err)
  process.exit(1)
})
