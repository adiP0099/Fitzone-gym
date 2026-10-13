import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export async function saveTrialRequest({ fullName, email, phone, preferredVisit, goals }) {
  if (!db) {
    const error = new Error('Cloud Firestore is unavailable.')
    error.code = 'firestore/not-configured'
    throw error
  }

  return addDoc(collection(db, 'trialRequests'), {
    fullName,
    email,
    phone,
    preferredVisit,
    goals,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

export function getTrialRequestErrorMessage(error) {
  if (error?.code === 'permission-denied') {
    return 'We could not save your request. Please try again later or contact FitZone directly.'
  }
  if (error?.code === 'unavailable' || error?.code === 'network-request-failed') {
    return 'A connection issue interrupted your request. Check your connection and try again.'
  }
  if (error?.code === 'firestore/not-configured') {
    return 'Trial requests are temporarily unavailable. Please contact FitZone directly.'
  }
  return 'Your request could not be saved. Please try again.'
}
