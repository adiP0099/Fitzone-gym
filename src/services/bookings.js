import { getIdTokenResult } from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import { auth, db } from './firebase'

function bookingError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function requireFirestore() {
  if (!db) throw bookingError('firestore/not-configured', 'Cloud Firestore is unavailable.')
  return db
}

function requireMember(user) {
  if (!user?.uid || auth?.currentUser?.uid !== user.uid) {
    throw bookingError('booking/auth-required', 'Sign in before managing bookings.')
  }
}

async function requireAdmin(user) {
  requireMember(user)
  const token = await getIdTokenResult(user, true)
  if (token.claims.admin !== true) {
    throw bookingError('admin/claim-required', 'This action requires the trusted Firebase admin claim.')
  }
}

function sortSessions(sessions) {
  return sessions.sort((a, b) => (a.startsAt?.toMillis?.() ?? 0) - (b.startsAt?.toMillis?.() ?? 0))
}

function sortBookings(bookings) {
  return bookings.sort((a, b) => (a.startsAt?.toMillis?.() ?? 0) - (b.startsAt?.toMillis?.() ?? 0))
}

export function subscribeAvailableSessions(onSessions, onError) {
  const firestore = requireFirestore()
  const sessionsQuery = query(collection(firestore, 'sessions'), where('active', '==', true))
  return onSnapshot(sessionsQuery, snapshot => {
    const now = Date.now()
    const sessions = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(session => session.startsAt?.toDate?.().getTime() > now)
    onSessions(sortSessions(sessions))
  }, onError)
}

export function subscribeMemberBookings(user, onBookings, onError) {
  requireMember(user)
  const firestore = requireFirestore()
  const ownBookingsQuery = query(collection(firestore, 'bookings'), where('uid', '==', user.uid))
  return onSnapshot(ownBookingsQuery, snapshot => {
    onBookings(sortBookings(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))))
  }, onError)
}

export async function getAdminSessions(user) {
  await requireAdmin(user)
  const snapshot = await getDocs(collection(requireFirestore(), 'sessions'))
  return sortSessions(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
}

export async function getAdminBookings(user) {
  await requireAdmin(user)
  const snapshot = await getDocs(collection(requireFirestore(), 'bookings'))
  return sortBookings(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
}

export async function getAdminMemberNames(user, memberUids) {
  await requireAdmin(user)
  const uids = [...new Set(memberUids.filter(uid => typeof uid === 'string' && uid.length > 0 && uid.length <= 128))]
  const names = {}
  const firestore = requireFirestore()

  // Firestore supports up to 30 document IDs in one `in` query.
  for (let index = 0; index < uids.length; index += 30) {
    const batch = uids.slice(index, index + 30)
    const profilesQuery = query(collection(firestore, 'users'), where(documentId(), 'in', batch))
    const snapshot = await getDocs(profilesQuery)
    snapshot.docs.forEach(profile => {
      const data = profile.data()
      const displayName = typeof data.displayName === 'string' ? data.displayName.trim() : ''
      const emailPrefix = typeof data.email === 'string' ? data.email.split('@')[0].trim() : ''
      names[profile.id] = displayName || emailPrefix || ''
    })
  }

  return names
}

export async function createSession(user, { name, trainerName, startsAt }) {
  await requireAdmin(user)
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  const trimmedTrainer = typeof trainerName === 'string' ? trainerName.trim() : ''
  const startDate = startsAt instanceof Date ? startsAt : new Date(startsAt)
  if (trimmedName.length < 3 || trimmedName.length > 100) {
    throw bookingError('booking/invalid-session-name', 'Enter a session name between 3 and 100 characters.')
  }
  if (trimmedTrainer.length > 100) {
    throw bookingError('booking/invalid-trainer-name', 'Trainer name must be 100 characters or fewer.')
  }
  if (!Number.isFinite(startDate.getTime()) || startDate.getTime() <= Date.now()) {
    throw bookingError('booking/invalid-session-time', 'Choose a valid future date and time.')
  }

  const session = {
    name: trimmedName,
    trainerName: trimmedTrainer,
    startsAt: Timestamp.fromDate(startDate),
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const result = await addDoc(collection(requireFirestore(), 'sessions'), session)
  return { id: result.id, ...session }
}

export async function setSessionActive(user, sessionId, active) {
  await requireAdmin(user)
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId) || typeof active !== 'boolean') {
    throw bookingError('booking/invalid-session', 'The session update is invalid.')
  }
  await setDoc(doc(requireFirestore(), 'sessions', sessionId), {
    active,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function createMemberBooking(user, sessionId) {
  requireMember(user)
  if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
    throw bookingError('booking/invalid-session', 'Choose an available session.')
  }

  const firestore = requireFirestore()
  const sessionRef = doc(firestore, 'sessions', sessionId)
  const sessionSnapshot = await getDoc(sessionRef)
  if (!sessionSnapshot.exists()) {
    throw bookingError('booking/session-unavailable', 'This session is no longer available. Refresh and choose another session.')
  }
  const session = sessionSnapshot.data()
  if (session.active !== true || !(session.startsAt?.toDate?.() instanceof Date)
    || session.startsAt.toDate().getTime() <= Date.now()) {
    throw bookingError('booking/session-unavailable', 'This session is no longer available. Refresh and choose another session.')
  }

  const bookingId = `${user.uid}_${sessionId}`
  const booking = {
    uid: user.uid,
    sessionId,
    sessionName: session.name,
    trainerName: session.trainerName ?? '',
    startsAt: session.startsAt,
    status: 'confirmed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  try {
    await setDoc(doc(firestore, 'bookings', bookingId), booking)
  } catch (error) {
    if (error?.code === 'permission-denied') {
      throw bookingError('booking/already-booked', 'This booking already exists or the session is no longer available.')
    }
    throw error
  }
  return { id: bookingId, ...booking }
}
