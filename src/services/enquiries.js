import { getIdTokenResult } from 'firebase/auth'
import { collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

const TRIAL_STATUSES = ['pending', 'contacted', 'approved', 'completed']

async function verifyAdmin(user) {
  if (!user || !auth?.currentUser || auth.currentUser.uid !== user.uid) {
    const error = new Error('Sign in with an authorized FitZone administrator account.')
    error.code = 'admin/auth-required'
    throw error
  }
  const token = await getIdTokenResult(user, true)
  if (token.claims.admin !== true) {
    const error = new Error('This account does not have the trusted Firebase admin claim.')
    error.code = 'admin/claim-required'
    throw error
  }
  if (!db) {
    const error = new Error('Cloud Firestore is unavailable.')
    error.code = 'firestore/not-configured'
    throw error
  }
}

export async function getTrialRequestsForAdmin(user) {
  await verifyAdmin(user)

  const requestsQuery = query(collection(db, 'trialRequests'), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(requestsQuery)
  return snapshot.docs.map(request => ({ id: request.id, ...request.data() }))
}

export async function updateTrialRequestStatus(user, requestId, status) {
  await verifyAdmin(user)
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{1,1500}$/.test(requestId)) {
    const error = new Error('The trial request identifier is invalid.')
    error.code = 'trial-request/invalid-id'
    throw error
  }
  if (!TRIAL_STATUSES.includes(status)) {
    const error = new Error('Choose a valid trial request status.')
    error.code = 'trial-request/invalid-status'
    throw error
  }
  await updateDoc(doc(db, 'trialRequests', requestId), { status, updatedAt: serverTimestamp() })
}
