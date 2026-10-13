import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { existsSync, realpathSync, statSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXPECTED_PROJECT_ID = 'fitzone-gym-442d6'
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const email = process.argv[2]?.trim()

function stop(message, exitCode = 1) {
  console.error(message)
  process.exitCode = exitCode
}

function verifyProjectConfiguration() {
  for (const variableName of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT']) {
    const configuredProject = process.env[variableName]
    if (configuredProject && configuredProject !== EXPECTED_PROJECT_ID) {
      throw new Error(`${variableName} points to a different project. No changes were made.`)
    }
  }

  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (credentialPath) {
    const resolvedCredentialPath = realpathSync(resolve(credentialPath))
    const relativePath = relative(projectRoot, resolvedCredentialPath)
    const isInsideRepository = relativePath === ''
      || (relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
    if (isInsideRepository) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS must point outside the project repository. No changes were made.')
    }
    if (!existsSync(resolvedCredentialPath) || !statSync(resolvedCredentialPath).isFile()) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS does not point to a readable credential file. No changes were made.')
    }
  }
}

async function main() {
  if (!email || process.argv.length !== 3) {
    stop('Usage: npm run admin:set-claim -- existing-user@example.com', 2)
    return
  }

  let app
  try {
    verifyProjectConfiguration()
    app = initializeApp({
      credential: applicationDefault(),
      projectId: EXPECTED_PROJECT_ID,
    }, `fitzone-admin-claim-${process.pid}`)
  } catch (error) {
    stop(`Admin SDK setup stopped: ${error.message}`)
    return
  }

  if (app.options.projectId !== EXPECTED_PROJECT_ID) {
    stop('Firebase project verification failed. No changes were made.')
    return
  }
  console.log(`Verified Firebase project: ${app.options.projectId}`)

  const auth = getAuth(app)
  let user
  try {
    user = await auth.getUserByEmail(email)
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      stop(`No existing Firebase Authentication user was found for ${email}. No user was created and no changes were made.`)
      return
    }
    stop(`Could not look up the Firebase Authentication user (${error.code ?? 'unknown'}). No changes were made.`)
    return
  }

  console.log('\nExisting Firebase Authentication user:')
  console.log(`  Email: ${user.email ?? email}`)
  console.log(`  UID:   ${user.uid}`)
  const confirmationPhrase = `SET ADMIN ${user.email ?? email}`
  const readline = createInterface({ input: stdin, output: stdout })
  let confirmation
  try {
    confirmation = await readline.question(`\nType "${confirmationPhrase}" to assign the admin claim: `)
  } finally {
    readline.close()
  }

  if (confirmation !== confirmationPhrase) {
    stop('Confirmation did not match. No changes were made.', 2)
    return
  }

  if (user.customClaims?.admin === true) {
    console.log('This user already has admin: true. No changes were needed.')
    return
  }

  try {
    const preservedClaims = user.customClaims ?? {}
    await auth.setCustomUserClaims(user.uid, { ...preservedClaims, admin: true })
    const verifiedUser = await auth.getUser(user.uid)
    if (verifiedUser.customClaims?.admin !== true) {
      stop('The Admin SDK call completed, but the claim could not be verified. Check the account in Firebase Admin before proceeding.')
      return
    }
    console.log(`Verified: admin: true is assigned to ${verifiedUser.email} (${verifiedUser.uid}).`)
    console.log('Other existing custom claims were preserved. Sign out and back in to refresh the ID token in the app.')
  } catch (error) {
    stop(`Could not assign the admin claim (${error.code ?? 'unknown'}). No further changes were made.`)
  }
}

await main()
