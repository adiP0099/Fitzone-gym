import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const envConfigKeys = {
  VITE_FIREBASE_API_KEY: 'apiKey',
  VITE_FIREBASE_AUTH_DOMAIN: 'authDomain',
  VITE_FIREBASE_PROJECT_ID: 'projectId',
  VITE_FIREBASE_STORAGE_BUCKET: 'storageBucket',
  VITE_FIREBASE_MESSAGING_SENDER_ID: 'messagingSenderId',
  VITE_FIREBASE_APP_ID: 'appId',
}
const missingKeys = Object.entries(envConfigKeys)
  .filter(([, configKey]) => !config[configKey])
  .map(([envKey]) => envKey)
const placeholderKeys = Object.entries(envConfigKeys)
  .filter(([, configKey]) => typeof config[configKey] === 'string'
    && /^(your(?:[_ -]?\w+)?|replace(?:[_ -]?\w+)?|change[_ -]?me|placeholder|<[^>]+>)$/i.test(config[configKey].trim()))
  .map(([envKey]) => envKey)
const emulatorFlagRequested = import.meta.env.DEV
  && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1'
const emulatorHostIsLoopback = ['localhost', '127.0.0.1', '::1'].includes(emulatorHost)
const emulatorConfigIssue = emulatorFlagRequested && !emulatorHostIsLoopback
  ? 'Firebase emulator mode requires a loopback host (localhost, 127.0.0.1, or ::1).'
  : null
export const firebaseConfigIssue = missingKeys.length
  ? `Firebase configuration is missing: ${missingKeys.join(', ')}.`
  : placeholderKeys.length
    ? `Firebase configuration contains placeholder values for: ${placeholderKeys.join(', ')}.`
  : config.projectId !== 'fitzone-gym-442d6'
    ? 'The configured Firebase project does not match fitzone-gym-442d6.'
    : emulatorConfigIssue
export const firebaseReady = firebaseConfigIssue === null
export const usingFirebaseEmulators = firebaseReady && emulatorFlagRequested

if (import.meta.env.DEV) {
  if (firebaseConfigIssue) {
    console.error('[FitZone] Firebase configuration is not ready:', firebaseConfigIssue)
  } else if (usingFirebaseEmulators) {
    console.info(`[FitZone] Firebase services are routed to local emulators for project ${config.projectId} at ${emulatorHost}.`)
  } else {
    console.info(`[FitZone] Firebase configuration loaded for project ${config.projectId}.`)
  }
}

export const app = firebaseReady
  ? (getApps().length ? getApp() : initializeApp(config))
  : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null
export const functions = app ? getFunctions(app, 'us-central1') : null

if (usingFirebaseEmulators) {
  const emulatorHttpHost = emulatorHost.includes(':') ? `[${emulatorHost}]` : emulatorHost
  connectAuthEmulator(auth, `http://${emulatorHttpHost}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, emulatorHost, 8080)
  connectFunctionsEmulator(functions, emulatorHost, 5001)
  connectStorageEmulator(storage, emulatorHost, 9199)
}

export function requireFirebaseAuth() {
  if (!auth) {
    const error = new Error(firebaseConfigIssue ?? 'Firebase Authentication is unavailable.')
    error.code = 'firebase/not-configured'
    throw error
  }
  return auth
}
