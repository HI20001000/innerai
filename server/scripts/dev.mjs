import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const serverRoot = dirname(currentDir)
const tsEntry = join(serverRoot, 'src', 'index.ts')
const jsEntry = join(serverRoot, 'index.js')

const hasTypeScriptEntry = existsSync(tsEntry)

const commandArgs = hasTypeScriptEntry
  ? [
      '--import',
      `data:text/javascript,import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register('ts-node/esm', pathToFileURL('./'));`,
      '--watch',
      tsEntry,
    ]
  : ['--watch', jsEntry]

const child = spawn(process.execPath, commandArgs, {
  stdio: 'inherit',
  env: process.env,
  cwd: serverRoot,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
