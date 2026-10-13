import { getIdTokenResult } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { app, auth, db, functions, usingFirebaseEmulators } from './firebase'

function requestError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function requireFirestore() {
  if (!db) throw requestError('firestore/not-configured', 'Cloud Firestore is unavailable.')
  return db
}

function requireCurrentUser(user) {
  if (!user?.uid || !auth || auth.currentUser?.uid !== user.uid) {
    throw requestError('membership/auth-required', 'Sign in before requesting a membership plan.')
  }
  if (!user.email) {
    throw requestError('membership/email-required', 'A verified email address is required to submit a plan request.')
  }
}

async function requireAdmin(user) {
  requireCurrentUser(user)
  const token = await getIdTokenResult(user, true)
  if (token.claims.admin !== true) {
    throw requestError('admin/claim-required', 'This action requires the trusted Firebase admin claim.')
  }
}

function newestFirst(requests) {
  return requests.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
}

export async function submitMembershipRequest(user, planId) {
  requireCurrentUser(user)
  if (typeof planId !== 'string' || !/^[a-z0-9-]{1,64}$/.test(planId)) {
    throw requestError('membership/invalid-plan', 'Choose an available membership plan.')
  }

  const firestore = requireFirestore()
  const planSnapshot = await getDoc(doc(firestore, 'plans', planId))
  if (!planSnapshot.exists()) {
    throw requestError('membership/plan-unavailable', 'This plan is no longer available. Refresh the page and choose an active plan.')
  }
  const plan = planSnapshot.data()
  if (plan.active !== true || typeof plan.name !== 'string' || typeof plan.price !== 'number') {
    throw requestError('membership/plan-unavailable', 'This plan is no longer available. Refresh the page and choose an active plan.')
  }

  const request = {
    uid: user.uid,
    email: user.email,
    planId: planSnapshot.id,
    planName: plan.name,
    price: plan.price,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const requestRef = await addDoc(collection(firestore, 'membershipRequests'), request)
  return { id: requestRef.id, ...request }
}

export async function getMemberMembershipRequests(user) {
  requireCurrentUser(user)
  const firestore = requireFirestore()
  const memberQuery = query(collection(firestore, 'membershipRequests'), where('uid', '==', user.uid))
  const snapshot = await getDocs(memberQuery)
  return newestFirst(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
}

export function subscribeMemberMembershipRequests(user, onRequests, onError) {
  requireCurrentUser(user)
  const firestore = requireFirestore()
  const memberQuery = query(collection(firestore, 'membershipRequests'), where('uid', '==', user.uid))
  return onSnapshot(memberQuery, snapshot => {
    onRequests(newestFirst(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))))
  }, onError)
}

export async function getAdminMembershipRequests(user) {
  await requireAdmin(user)
  const firestore = requireFirestore()
  const snapshot = await getDocs(collection(firestore, 'membershipRequests'))
  return newestFirst(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
}

export async function reviewMembershipRequest(user, requestId, status) {
  await requireAdmin(user)
  if (!['approved', 'rejected'].includes(status)) {
    throw requestError('membership/invalid-status', 'Choose approve or reject for a pending request.')
  }
  if (status === 'approved') {
    if (!app || !functions) throw requestError('functions/not-configured', 'The secure membership approval service is unavailable.')
    if (import.meta.env.DEV) {
      console.info(`[FitZone] Membership approval callable uses ${usingFirebaseEmulators ? 'the local Functions emulator' : 'the configured Firebase Functions service'}.`)
    }
    const approve = httpsCallable(functions, 'approveMembershipRequest')
    const result = await approve({ requestId })
    if (result.data?.approved !== true || result.data?.subscriptionAssigned !== true) {
      throw requestError('membership/approval-incomplete', 'The server did not confirm both approval and subscription assignment.')
    }
    return result.data
  }
  const firestore = requireFirestore()
  await updateDoc(doc(firestore, 'membershipRequests', requestId), {
    status,
    updatedAt: serverTimestamp(),
  })
  return status
}
