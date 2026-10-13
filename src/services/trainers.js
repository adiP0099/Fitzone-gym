import { getIdTokenResult } from 'firebase/auth'
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { auth, db } from './firebase'

function trainerError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function requireFirestore() {
  if (!db) throw trainerError('firestore/not-configured', 'Cloud Firestore is unavailable.')
  return db
}

async function requireAdmin(user) {
  if (!user?.uid || auth?.currentUser?.uid !== user.uid) {
    throw trainerError('admin/auth-required', 'Sign in with a FitZone administrator account.')
  }
  const token = await getIdTokenResult(user, true)
  if (token.claims.admin !== true) {
    throw trainerError('admin/claim-required', 'This action requires the trusted Firebase admin claim.')
  }
}

function validateTrainer(input) {
  const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : ''
  const specialties = Array.isArray(input.specialties)
    ? [...new Set(input.specialties.filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean))]
    : []
  const bio = typeof input.bio === 'string' ? input.bio.trim() : ''

  if (displayName.length < 2 || displayName.length > 100) {
    throw trainerError('trainers/invalid-name', 'Enter a trainer name between 2 and 100 characters.')
  }
  if (specialties.length < 1 || specialties.length > 10
    || specialties.some(value => value.length < 2 || value.length > 80)) {
    throw trainerError('trainers/invalid-specialties', 'Add 1 to 10 specializations, each 2 to 80 characters long.')
  }
  if (bio.length > 1000) {
    throw trainerError('trainers/invalid-bio', 'Trainer bio must be 1,000 characters or fewer.')
  }
  if (typeof input.isPublished !== 'boolean') {
    throw trainerError('trainers/invalid-status', 'Choose whether this trainer profile is published.')
  }

  return { displayName, specialties, bio, isPublished: input.isPublished }
}

export async function subscribeAdminTrainers(user, onTrainers, onError) {
  await requireAdmin(user)
  const trainersQuery = query(collection(requireFirestore(), 'trainers'), orderBy('displayName'))
  return onSnapshot(trainersQuery, snapshot => {
    onTrainers(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
  }, onError)
}

export async function createTrainer(user, input) {
  await requireAdmin(user)
  const trainer = validateTrainer(input)
  const now = serverTimestamp()
  const result = await addDoc(collection(requireFirestore(), 'trainers'), {
    ...trainer,
    createdAt: now,
    updatedAt: now,
  })
  return result.id
}

export async function updateTrainer(user, trainerId, input) {
  await requireAdmin(user)
  if (typeof trainerId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(trainerId)) {
    throw trainerError('trainers/invalid-id', 'The selected trainer record is invalid.')
  }
  const trainer = validateTrainer(input)
  await updateDoc(doc(requireFirestore(), 'trainers', trainerId), {
    ...trainer,
    updatedAt: serverTimestamp(),
  })
}
