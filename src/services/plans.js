import { getIdTokenResult } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { plans as previewPlans } from '../data/mock'
import { auth, db } from './firebase'

const PLAN_PERIODS = ['week', 'month', 'year']

function serviceError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function requireFirestore() {
  if (!db) throw serviceError('firestore/not-configured', 'Cloud Firestore is unavailable.')
  return db
}

async function requireAdmin(user) {
  if (!user || !auth || auth.currentUser?.uid !== user.uid) {
    throw serviceError('admin/auth-required', 'Sign in with an authorized FitZone admin account.')
  }
  const token = await getIdTokenResult(user, true)
  if (token.claims.admin !== true) {
    throw serviceError('admin/claim-required', 'This account does not have the trusted Firebase admin claim.')
  }
}

function normalizePlanName(name) {
  return name.trim().toLocaleLowerCase()
}

function planSlug(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function sortPlans(plans) {
  return plans.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
    || a.name.localeCompare(b.name))
}

export async function getPublicPlans() {
  const firestore = requireFirestore()
  const plansQuery = query(collection(firestore, 'plans'), where('active', '==', true))
  const snapshot = await getDocs(plansQuery)
  return sortPlans(snapshot.docs.map(plan => ({ id: plan.id, ...plan.data() })))
}

export async function getAdminPlans(user) {
  await requireAdmin(user)
  const firestore = requireFirestore()
  const snapshot = await getDocs(collection(firestore, 'plans'))
  return sortPlans(snapshot.docs.map(plan => ({ id: plan.id, ...plan.data() })))
}

function buildPlanFields(input) {
  const values = input ?? {}
  const name = String(values.name ?? '').trim()
  const description = String(values.description ?? '').trim()
  const priceText = String(values.price ?? '').trim()
  const price = Number(priceText)
  const period = values.period
  const features = Array.isArray(values.features)
    ? values.features.map(feature => String(feature).trim())
    : []
  const sortOrder = Number(values.sortOrder)
  if (name.length < 2 || name.length > 60) {
    throw serviceError('plans/invalid-input', 'Plan name must be 2 to 60 characters.')
  }
  if (!description || description.length > 500) {
    throw serviceError('plans/invalid-input', 'Description must be 1 to 500 characters.')
  }
  if (!priceText || !Number.isFinite(price) || price < 0 || price > 10000) {
    throw serviceError('plans/invalid-input', 'Price must be between 0 and 10,000.')
  }
  if (!PLAN_PERIODS.includes(period)) {
    throw serviceError('plans/invalid-input', 'Choose a valid plan duration.')
  }
  if (!features.length || features.length > 10
    || features.some(feature => feature.length < 2 || feature.length > 140)) {
    throw serviceError('plans/invalid-input', 'Enter 1 to 10 benefits, each 2 to 140 characters.')
  }
  if (new Set(features.map(feature => feature.toLocaleLowerCase())).size !== features.length) {
    throw serviceError('plans/invalid-input', 'Remove duplicate benefits.')
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
    throw serviceError('plans/invalid-input', 'Display order must be a whole number from 0 to 999.')
  }
  if (typeof values.featured !== 'boolean' || typeof values.active !== 'boolean') {
    throw serviceError('plans/invalid-input', 'Plan featured and active settings must be selected.')
  }
  return { name, description, price, period, features, featured: values.featured, active: values.active, sortOrder }
}

async function assertUniqueName(user, name, exceptId = '') {
  const currentPlans = await getAdminPlans(user)
  if (currentPlans.some(plan => plan.id !== exceptId
    && normalizePlanName(plan.name) === normalizePlanName(name))) {
    throw serviceError('plans/name-exists', 'A plan with this name already exists.')
  }
}

export async function createPlan(user, input) {
  await requireAdmin(user)
  const firestore = requireFirestore()
  const fields = buildPlanFields(input)
  await assertUniqueName(user, fields.name)
  const id = planSlug(fields.name)
  if (!id) throw serviceError('plans/invalid-input', 'Plan name must include a letter or number.')
  const planRef = doc(firestore, 'plans', id)
  await runTransaction(firestore, async transaction => {
    const existing = await transaction.get(planRef)
    if (existing.exists()) throw serviceError('plans/id-exists', 'A plan already uses this plan ID. Choose a different name.')
    transaction.set(planRef, { ...fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  })
  return { id, ...fields }
}

export async function updatePlan(user, id, input) {
  await requireAdmin(user)
  const firestore = requireFirestore()
  const fields = buildPlanFields(input)
  await assertUniqueName(user, fields.name, id)
  const planRef = doc(firestore, 'plans', id)
  await updateDoc(planRef, { ...fields, updatedAt: serverTimestamp() })
  return { id, ...fields }
}

export async function setPlanActive(user, plan, active) {
  await requireAdmin(user)
  if (typeof active !== 'boolean') throw serviceError('plans/invalid-input', 'Plan active status must be selected.')
  const firestore = requireFirestore()
  await updateDoc(doc(firestore, 'plans', plan.id), { active, updatedAt: serverTimestamp() })
  return { ...plan, active }
}

export async function importMissingPreviewPlans(user) {
  await requireAdmin(user)
  const firestore = requireFirestore()
  const existingPlans = await getAdminPlans(user)
  const existingNames = new Set(existingPlans.map(plan => normalizePlanName(plan.name)))
  const existingIds = new Set(existingPlans.map(plan => plan.id))
  let created = 0
  let skipped = 0

  for (const [index, previewPlan] of previewPlans.entries()) {
    const normalizedName = normalizePlanName(previewPlan.name)
    if (existingNames.has(normalizedName)) {
      skipped += 1
      continue
    }

    const fields = buildPlanFields({
      ...previewPlan,
      active: true,
      sortOrder: index,
    })
    const baseId = planSlug(fields.name)
    let id = baseId
    let suffix = 2
    while (existingIds.has(id)) id = `${baseId}-${suffix++}`

    const planRef = doc(firestore, 'plans', id)
    const wasCreated = await runTransaction(firestore, async transaction => {
      const existing = await transaction.get(planRef)
      if (existing.exists()) return false
      transaction.set(planRef, { ...fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      return true
    })

    if (wasCreated) {
      created += 1
      existingNames.add(normalizedName)
      existingIds.add(id)
    } else {
      skipped += 1
    }
  }
  return { created, skipped }
}
