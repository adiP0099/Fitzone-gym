import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

function validateSubscription(uid, snapshot) {
  if (!snapshot.exists()) return null
  const subscription = snapshot.data()
  if (subscription.uid !== uid || typeof subscription.planId !== 'string' || typeof subscription.status !== 'string') {
    const error = new Error('The saved membership record is incomplete or does not match the signed-in user.')
    error.code = 'membership/invalid-subscription'
    throw error
  }
  return subscription
}

function getSubscriptionRef(uid) {
  if (!uid) throw new Error('An authenticated user is required to load a membership.')
  if (!db) {
    const error = new Error('Cloud Firestore is unavailable.')
    error.code = 'firestore/not-configured'
    throw error
  }

  return doc(db, 'users', uid, 'subscriptions', 'current')
}

export async function getMemberSubscription(uid) {
  return validateSubscription(uid, await getDoc(getSubscriptionRef(uid)))
}

export function subscribeMemberSubscription(uid, onSubscription, onError) {
  return onSnapshot(getSubscriptionRef(uid), snapshot => {
    try { onSubscription(validateSubscription(uid, snapshot)) } catch (error) { onError(error) }
  }, onError)
}
