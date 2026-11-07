#!/usr/bin/env node
/**
 * Clone Medusa PostgreSQL (and optional static files) from staging to production.
 * Run on prod1 as the medusa user after prod .env exists (see setup-env.sh).
 *
 * Required env:
 *   STAGING_SSH_HOST     — staging server hostname
 * Optional:
 *   STAGING_SSH_KEY      — SSH private key path (default ~/.ssh/id_rsa)
 *   STAGING_SSH_USER     — default medusa
 *   MEDUSA_APP_DIR       — default ~/app/medusa
 *   BACKUP_DIR           — default ~/backups/medusa-db
 *
 * Flags:
 *   --dry-run            — print steps only
 *   --confirm-prod       — required for destructive run
 *   --skip-static        — do not rsync ~/app/medusa/static
 *   --skip-opensearch    — skip npm run search:reindex
 *   --skip-redis         — skip Redis FLUSHDB for listing keys only
 *
 * Usage:
 *   STAGING_SSH_HOST=... node scripts/prod/copy-staging-to-prod.mjs --confirm-prod
 */
import { spawnSync, execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(__dirname, '../..')

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const confirmed = args.has('--confirm-prod')
const skipStatic = args.has('--skip-static')
const skipOpenSearch = args.has('--skip-opensearch')
const skipRedis = args.has('--skip-redis')

const stagingHost = process.env.STAGING_SSH_HOST?.trim()
const sshKey = process.env.STAGING_SSH_KEY?.trim() || join(homedir(), '.ssh/id_rsa')
const stagingUser = process.env.STAGING_SSH_USER?.trim() || 'medusa'
const appDir = process.env.MEDUSA_APP_DIR?.trim() || join(homedir(), 'app/medusa')
const backupDir = process.env.BACKUP_DIR?.trim() || join(homedir(), 'backups/medusa-db')
const envPath = join(appDir, '.env')

function log(msg) {
  console.log(msg)
}

function fail(msg) {
  console.error(`ERROR: ${msg}`)
  process.exit(1)
}

function run(cmd, cmdArgs, opts = {}) {
  if (dryRun) {
    log(`[dry-run] ${cmd} ${cmdArgs.join(' ')}`)
    return { status: 0, stdout: '', stderr: '' }
  }
  const r = spawnSync(cmd, cmdArgs, {
    stdio: opts.capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    ...opts,
  })
  if (r.status !== 0) {
    const err = r.stderr || r.stdout || `exit ${r.status}`
    fail(`${cmd} failed: ${err}`)
  }
  return r
}

function sshBuffer(remoteCmd) {
  if (dryRun) {
    log(`[dry-run] ssh ${stagingUser}@${stagingHost} ${remoteCmd}`)
    return Buffer.alloc(0)
  }
  const sshArgs = ['-o', 'BatchMode=yes', '-i', sshKey, `${stagingUser}@${stagingHost}`, remoteCmd]
  const r = spawnSync('ssh', sshArgs, { encoding: 'buffer' })
  if (r.status !== 0) {
    fail(`ssh failed: ${(r.stderr || '').toString()}`)
  }
  return r.stdout
}

function loadEnvFile(path) {
  if (!existsSync(path)) fail(`Missing ${path}`)
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq)
    let val = t.slice(eq + 1)
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function redisFlushListing(redisUrl) {
  if (!redisUrl) {
    log('==> REDIS_URL unset — skip Redis flush')
    return
  }
  const script = `
const u = new URL(${JSON.stringify(redisUrl)});
const Redis = require('ioredis');
(async () => {
  const r = new Redis(u.toString());
  const patterns = ['store:listing:*', 'store:event:detail:*', 'store:listing:dirty:*'];
  for (const p of patterns) {
    let cursor = '0';
    do {
      const [next, keys] = await r.scan(cursor, 'MATCH', p, 'COUNT', 500);
      cursor = next;
      if (keys.length) await r.del(...keys);
    } while (cursor !== '0');
  }
  await r.quit();
  console.log('Redis listing keys flushed');
})().catch(e => { console.error(e); process.exit(1); });
`
  const medusaNodeModules = join(appDir, 'node_modules')
  if (dryRun) {
    log('[dry-run] flush Redis listing keys via ioredis')
    return
  }
  execFileSync(process.execPath, ['-e', script], {
    cwd: appDir,
    env: { ...process.env, NODE_PATH: medusaNodeModules },
    stdio: 'inherit',
  })
}

if (!stagingHost) fail('Set STAGING_SSH_HOST')
if (!confirmed && !dryRun) {
  fail('Refusing to run without --confirm-prod (use --dry-run to preview)')
}

const env = loadEnvFile(envPath)
const prodDbUrl = env.DATABASE_URL?.trim()
const redisUrl = env.REDIS_URL?.trim()
if (!prodDbUrl) fail('DATABASE_URL missing in medusa .env')

mkdirSync(backupDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupFile = join(backupDir, `prod-before-staging-clone-${stamp}.dump`)
const stagingDumpFile = join(backupDir, `staging-${stamp}.dump`)

log('==> Stopping medusa PM2 processes')
if (!dryRun) {
  spawnSync('pm2', ['stop', 'medusa', 'medusa-worker'], { stdio: 'inherit' })
}

log(`==> Backing up production database to ${backupFile}`)
run('pg_dump', ['-Fc', '--no-owner', '--no-acl', '-f', backupFile, prodDbUrl], { capture: false })

log(`==> Dumping staging database via SSH (${stagingUser}@${stagingHost})`)
const remoteDump =
  "set -euo pipefail; set -a; source ~/app/medusa/.env; set +a; pg_dump \"$DATABASE_URL\" -Fc --no-owner --no-acl"
if (dryRun) {
  log(`[dry-run] ssh … '${remoteDump}' > ${stagingDumpFile}`)
} else {
  const dumpBuf = sshBuffer(remoteDump)
  if (!dumpBuf?.length) fail('Empty pg_dump from staging')
  writeFileSync(stagingDumpFile, dumpBuf)
}

log('==> Restoring staging dump into production (pg_restore --clean --if-exists)')
const restoreArgs = ['--clean', '--if-exists', '--no-owner', '--no-acl', '-d', prodDbUrl, stagingDumpFile]
run('pg_restore', restoreArgs, { capture: false })

log('==> Running Medusa migrations')
run('npx', ['medusa', 'db:migrate', '--execute-all-links'], { cwd: appDir, shell: true })

if (!skipRedis) {
  log('==> Flushing listing/event Redis keys on production')
  redisFlushListing(redisUrl)
}

if (!skipStatic) {
  log('==> Rsync medusa/static from staging')
  const src = `${stagingUser}@${stagingHost}:~/app/medusa/static/`
  const dest = join(appDir, 'static/')
  mkdirSync(dest, { recursive: true })
  run('rsync', ['-avz', '-e', `ssh -i ${sshKey} -o BatchMode=yes`, src, dest])
}

log('==> Reloading PM2')
run('pm2', ['startOrReload', 'ecosystem.config.cjs', '--update-env'], { cwd: appDir })

if (!skipOpenSearch && env.OPENSEARCH_NODE) {
  log('==> OpenSearch full reindex')
  run('npm', ['run', 'search:reindex'], { cwd: appDir, shell: true })
} else if (!skipOpenSearch) {
  log('==> OPENSEARCH_NODE unset — skip search:reindex')
}

log('')
log('==> Clone complete')
log(`    Prod backup: ${backupFile}`)
log(`    Staging dump kept: ${stagingDumpFile}`)
log('    Rollback: pm2 stop medusa medusa-worker && pg_restore --clean --if-exists -d "$DATABASE_URL" ' + backupFile)
