import { getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

const PROJECT_ID = 'fitzone-gym-442d6'
const BILLING_PERIODS = new Set(['week', 'month', 'year'])

if (!getApps().length) initializeApp()
const db = getFirestore()

function addBillingPeriod(start, period) {
  if (period === 'week') return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)

  const monthOffset = period === 'month' ? 1 : 12
  const targetMonth = start.getUTCMonth() + monthOffset
  const end = new Date(Date.UTC(
    start.getUTCFullYear(), targetMonth, 1,
    start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), start.getUTCMilliseconds(),
  ))
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate()
  end.setUTCDate(Math.min(start.getUTCDate(), lastDay))
  return end
}

function validatePlan(plan) {
  return plan?.active === true
    && typeof plan.name === 'string'
    && plan.name.trim().length >= 2
    && plan.name.trim().length <= 60
    && typeof plan.price === 'number'
    && Number.isFinite(plan.price)
    && plan.price >= 0
    && plan.price <= 10000
    && BILLING_PERIODS.has(plan.period)
    && Array.isArray(plan.features)
    && plan.features.length >= 1
    && plan.features.length <= 10
    && plan.features.every(feature => typeof feature === 'string'
      && feature.trim().length >= 2
      && feature.trim().length <= 140)
}

export const approveMembershipRequest = onCall({ region: 'us-central1' }, async request => {
  if (process.env.GCLOUD_PROJECT !== PROJECT_ID) {
    throw new HttpsError('internal', 'Membership approval is not configured for this Firebase project.')
  }
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in with an administrator account to approve membership requests.')
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'This account does not have verified administrator access.')
  }

  const requestId = request.data?.requestId
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) {
    throw new HttpsError('invalid-argument', 'A valid membership request ID is required.')
  }

  const membershipRequestRef = db.collection('membershipRequests').doc(requestId)
  const startDate = new Date()
  const startedAt = Timestamp.fromDate(startDate)

  try {
    return await db.runTransaction(async transaction => {
      const requestSnapshot = await transaction.get(membershipRequestRef)
      if (!requestSnapshot.exists) {
        throw new HttpsError('not-found', 'This membership request could not be found.')
      }
      const membershipRequest = requestSnapshot.data()
      if (membershipRequest.status !== 'pending') {
        throw new HttpsError('failed-precondition', 'This request has already been reviewed.')
      }
      if (typeof membershipRequest.uid !== 'string' || !membershipRequest.uid
        || typeof membershipRequest.planId !== 'string'
        || !/^[a-z0-9-]{1,64}$/.test(membershipRequest.planId)) {
        throw new HttpsError('failed-precondition', 'This request is missing valid member or plan details.')
      }

      const planRef = db.collection('plans').doc(membershipRequest.planId)
      const subscriptionRef = db.collection('users').doc(membershipRequest.uid)
        .collection('subscriptions').doc('current')
      const [planSnapshot, subscriptionSnapshot] = await Promise.all([
        transaction.get(planRef),
        transaction.get(subscriptionRef),
      ])

      if (!planSnapshot.exists || !validatePlan(planSnapshot.data())) {
        throw new HttpsError('failed-precondition', 'The selected plan is missing or inactive. Activate a valid plan before approving this request.')
      }
      if (subscriptionSnapshot.exists) {
        throw new HttpsError('already-exists', 'This member already has a current subscription record. Review it before approving another request.')
      }

      const plan = planSnapshot.data()
      const currentPeriodEnd = Timestamp.fromDate(addBillingPeriod(startDate, plan.period))
      transaction.create(subscriptionRef, {
        uid: membershipRequest.uid,
        planId: planSnapshot.id,
        planName: plan.name,
        price: plan.price,
        period: plan.period,
        features: plan.features,
        status: 'active',
        startedAt,
        currentPeriodEnd,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      transaction.update(membershipRequestRef, {
        status: 'approved',
        updatedAt: FieldValue.serverTimestamp(),
      })

      return { approved: true, subscriptionAssigned: true }
    })
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', 'The request could not be approved and the subscription was not assigned.')
  }
})
