import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { getAuth } from 'firebase-admin/auth'
import { getApps, initializeApp } from 'firebase-admin/app'

const PROJECT_ID = 'fitzone-gym-442d6'
const expectedEmulators = {
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
}
const email = process.argv[2]?.trim().toLowerCase()

function requireLocalEmulators() {
  if (process.env.GCLOUD_PROJECT !== PROJECT_ID) {
    throw new Error(`Set GCLOUD_PROJECT=${PROJECT_ID} before running this local-only helper.`)
  }
  for (const [name, expected] of Object.entries(expectedEmulators)) {
    if (process.env[name] !== expected) {
      throw new Error(`${name} must be ${expected}. Refusing to contact Firebase.`)
    }
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Usage: node scripts/create-emulator-admin.js <local-test-email>')
  }
}

function readHidden(promptText) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive PowerShell terminal to enter the local password safely.')
  }

  return new Promise((resolve, reject) => {
    let answer = ''
    stdout.write(promptText)
    stdin.setRawMode(true)
    stdin.resume()
    const finish = (error, value) => {
      stdin.removeListener('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
      stdout.write('\n')
      if (error) reject(error)
      else resolve(value)
    }
    const onData = chunk => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') return finish(new Error('Cancelled.'))
        if (char === '\r' || char === '\n') return finish(null, answer)
        if (char === '\u007f' || char === '\b') answer = answer.slice(0, -1)
        else if (char >= ' ') answer += char
      }
    }
    stdin.on('data', onData)
  })
}

async function main() {
  requireLocalEmulators()
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID })
  const auth = getAuth(app)
  let user
  let isNewUser = false

  try {
    user = await auth.getUserByEmail(email)
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error
    isNewUser = true
  }

  stdout.write(`Target local Auth Emulator user: ${email}${user ? ` (${user.uid})` : ' (will be created)'}\n`)
  stdout.write('This helper only accepts the local Auth and Firestore emulator endpoints.\n')
  const terminal = createInterface({ input: stdin, output: stdout })
  const confirmation = await terminal.question('Type LOCAL ONLY to continue: ')
  terminal.close()
  if (confirmation !== 'LOCAL ONLY') {
    stdout.write('No changes made.\n')
    return
  }

  if (isNewUser) {
    const password = await readHidden('Enter a password for this emulator-only account (input hidden): ')
    if (password.length < 6) throw new Error('The local test password must be at least 6 characters.')
    user = await auth.createUser({ email, password, displayName: email.split('@')[0] })
  }

  const claims = { ...(user.customClaims ?? {}), admin: true }
  await auth.setCustomUserClaims(user.uid, claims)
  stdout.write(`Local emulator admin is ready for ${email} (${user.uid}).\n`)
  stdout.write('No production Firebase account or data was changed. Sign in again to refresh the local ID token.\n')
}

main().catch(error => {
  console.error(error.message || 'Could not prepare the local emulator admin.')
  process.exitCode = 1
})
