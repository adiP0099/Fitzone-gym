import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { requireFirebaseAuth } from './firebase'
import { ensureMemberProfile } from './profiles'

const messages = {
  'auth/email-already-in-use': 'An account already exists for this email address. Try signing in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/invalid-credential': 'Email or password is incorrect. Check your details and try again.',
  'auth/user-not-found': 'Email or password is incorrect. Check your details and try again.',
  'auth/wrong-password': 'Email or password is incorrect. Check your details and try again.',
  'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
  'auth/user-disabled': 'This account is disabled. Contact FitZone for help.',
  'auth/too-many-requests': 'Too many attempts. Wait a little and try again.',
  'auth/network-request-failed': 'A network error interrupted the request. Check your connection and retry.',
  'auth/operation-not-allowed': 'Email and password sign-in is not enabled in the Firebase Console.',
  'auth/missing-email': 'Enter your email address first.',
  'auth/profile-update-failed': 'Your account was created and you are signed in, but your profile name could not be saved. You can update it later in your profile settings.',
  'firestore/profile-save-failed': 'Your account was created and you are signed in, but your cloud profile could not be saved. Please try again later; do not create another account.',
  'firestore/profile-load-failed': 'You are signed in, but your cloud profile could not be loaded. Check your connection or contact FitZone support.',
  'firestore/not-configured': 'Cloud Firestore is not available. Check the Firebase configuration.',
  'firebase/not-configured': 'Firebase is not configured. Check the required VITE_FIREBASE_* settings in .env.local.',
}

export function getAuthErrorMessage(error) {
  if (messages[error?.code]) return messages[error.code]
  if (typeof error?.code === 'string' && error.code.startsWith('auth/')) {
    return `Firebase could not complete this request. Please try again. If it keeps happening, contact FitZone support with error code ${error.code}.`
  }
  return 'We could not complete that request. Please try again.'
}

export function getUserDisplayName(user) {
  return user?.displayName?.trim() || user?.email?.split('@')[0] || 'Member'
}

export function getUserInitials(user) {
  return getUserDisplayName(user)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function logAuthError(error, operation) {
  if (!import.meta.env.DEV) return
  const cause = error?.cause
  console.error('[FitZone] Firebase Authentication request failed', {
    operation,
    code: error?.code ?? 'unknown',
    message: error?.message ?? String(error),
    ...(cause ? { cause: { code: cause.code ?? 'unknown', message: cause.message ?? String(cause) } } : {}),
  })
}

export async function registerWithEmail(email, password, displayName) {
  const credential = await createUserWithEmailAndPassword(requireFirebaseAuth(), email.trim(), password)
  const name = displayName.trim()
  if (name) {
    try {
      await updateProfile(credential.user, { displayName: name })
    } catch (cause) {
      const error = new Error(messages['auth/profile-update-failed'], { cause })
      error.code = 'auth/profile-update-failed'
      throw error
    }
  }
  try {
    await ensureMemberProfile(credential.user)
  } catch (cause) {
    const error = new Error(messages['firestore/profile-save-failed'], { cause })
    error.code = 'firestore/profile-save-failed'
    throw error
  }
  return credential.user
}

export async function signInWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(requireFirebaseAuth(), email.trim(), password)
  return credential.user
}

export function signOutCurrentUser() {
  return signOut(requireFirebaseAuth())
}

export function observeAuthState(onUser, onError) {
  return onAuthStateChanged(requireFirebaseAuth(), onUser, onError)
}

export function sendPasswordReset(email) {
  return sendPasswordResetEmail(requireFirebaseAuth(), email.trim())
}
