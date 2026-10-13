import { getIdTokenResult } from 'firebase/auth'
import { collection, collectionGroup, doc, onSnapshot, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

function requireFirestore() {
  if (!db) {
    const error = new Error('Cloud Firestore is unavailable. Check the Firebase configuration.')
    error.code = 'firestore/not-configured'
    throw error
  }
  return db
}

function getInitialProfile(user) {
  return {
    uid: user.uid,
    displayName: user.displayName?.trim() || user.email?.split('@')[0] || 'Member',
    email: user.email ?? '',
    role: 'member',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

export async function ensureMemberProfile(user) {
  if (!user?.uid) throw new Error('An authenticated user is required to load a profile.')

  const firestore = requireFirestore()
  const profileRef = doc(firestore, 'users', user.uid)
  return runTransaction(firestore, async transaction => {
    const existingProfile = await transaction.get(profileRef)
    if (existingProfile.exists()) return existingProfile.data()

    const newProfile = getInitialProfile(user)
    transaction.set(profileRef, newProfile)
    return {
      uid: newProfile.uid,
      displayName: newProfile.displayName,
      email: newProfile.email,
      role: newProfile.role,
    }
  })
}

export async function saveMemberProfile(user, { firstName, lastName, phoneNumber, fitnessGoals }) {
  if (!user?.uid || auth?.currentUser?.uid !== user.uid) {
    const error = new Error('Sign in to update your profile.')
    error.code = 'profile/auth-required'
    throw error
  }

  const values = {
    firstName: typeof firstName === 'string' ? firstName.trim() : '',
    lastName: typeof lastName === 'string' ? lastName.trim() : '',
    phoneNumber: typeof phoneNumber === 'string' ? phoneNumber.trim() : '',
    fitnessGoals: typeof fitnessGoals === 'string' ? fitnessGoals.trim() : '',
  }
  if (values.firstName.length < 1 || values.firstName.length > 60) {
    const error = new Error('First name is required and must be 60 characters or fewer.')
    error.code = 'profile/invalid-first-name'
    throw error
  }
  if (values.lastName.length > 60) {
    const error = new Error('Last name must be 60 characters or fewer.')
    error.code = 'profile/invalid-last-name'
    throw error
  }
  if (values.phoneNumber.length > 40 || !/^[+0-9().\-\s]*$/.test(values.phoneNumber)) {
    const error = new Error('Enter a valid phone number of 40 characters or fewer.')
    error.code = 'profile/invalid-phone'
    throw error
  }
  if (values.fitnessGoals.length > 1000) {
    const error = new Error('Fitness goals must be 1,000 characters or fewer.')
    error.code = 'profile/invalid-goals'
    throw error
  }

  const displayName = `${values.firstName} ${values.lastName}`.trim()
  if (displayName.length > 120) {
    const error = new Error('Your full name must be 120 characters or fewer.')
    error.code = 'profile/invalid-display-name'
    throw error
  }

  const firestore = requireFirestore()
  await updateDoc(doc(firestore, 'users', user.uid), {
    ...values,
    displayName,
    updatedAt: serverTimestamp(),
  })

  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName,
    ...values,
  }
}

export async function subscribeAdminMembers(user, onMembers, onError) {
  if (!user?.uid || auth?.currentUser?.uid !== user.uid) {
    const error = new Error('Sign in with an administrator account to view members.')
    error.code = 'admin/auth-required'
    throw error
  }
  const token = await getIdTokenResult(user, true)
  if (token.claims.admin !== true) {
    const error = new Error('This account does not have verified administrator access.')
    error.code = 'admin/claim-required'
    throw error
  }

  const firestore = requireFirestore()
  let profiles = null
  let subscriptions = null
  let profilesLoaded = false
  let subscriptionsLoaded = false
  const emit = () => {
    if (!profilesLoaded || !subscriptionsLoaded) return
    const subscriptionsByUid = new Map(subscriptions.map(subscription => [subscription.uid, subscription]))
    const members = profiles.map(profile => {
      const subscription = subscriptionsByUid.get(profile.uid) ?? null
      const expiryDate = subscription?.currentPeriodEnd?.toDate?.()
      const storedStatus = typeof subscription?.status === 'string' ? subscription.status : ''
      const membershipStatus = storedStatus === 'active'
        && expiryDate instanceof Date
        && expiryDate.getTime() <= Date.now()
        ? 'expired'
        : storedStatus || 'none'
      return { ...profile, subscription, membershipStatus }
    }).sort((first, second) => (second.createdAt?.toMillis?.() ?? 0) - (first.createdAt?.toMillis?.() ?? 0))
    onMembers(members)
  }

  let unsubscribeProfiles
  let unsubscribeSubscriptions
  try {
    unsubscribeProfiles = onSnapshot(collection(firestore, 'users'), snapshot => {
      profiles = snapshot.docs.map(item => ({ uid: item.id, ...item.data() }))
      profilesLoaded = true
      emit()
    }, onError)
    unsubscribeSubscriptions = onSnapshot(collectionGroup(firestore, 'subscriptions'), snapshot => {
      subscriptions = snapshot.docs
        .filter(item => item.id === 'current')
        .map(item => ({ uid: item.ref.parent.parent?.id, ...item.data() }))
        .filter(item => typeof item.uid === 'string')
      subscriptionsLoaded = true
      emit()
    }, onError)
  } catch (error) {
    unsubscribeProfiles?.()
    unsubscribeSubscriptions?.()
    throw error
  }

  return () => {
    unsubscribeProfiles?.()
    unsubscribeSubscriptions?.()
  }
}
