import { getIdTokenResult } from 'firebase/auth'
import { collection, collectionGroup, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'

function overviewError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function profileName(profile) {
  const name = typeof profile?.displayName === 'string' ? profile.displayName.trim() : ''
  const emailPrefix = typeof profile?.email === 'string' ? profile.email.split('@')[0].trim() : ''
  return name || emailPrefix || 'Member'
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'M'
}

function activeSubscription(subscription, now) {
  const expiry = subscription.currentPeriodEnd?.toDate?.()
  return subscription.status === 'active'
    && expiry instanceof Date
    && Number.isFinite(expiry.getTime())
    && expiry.getTime() > now
}

function eventTime(value) {
  const date = value?.toDate?.()
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null
}

function buildOverview(records) {
  const now = new Date()
  const profileByUid = new Map(records.profiles.map(profile => [profile.uid, profile]))
  const currentSubscriptions = records.subscriptions
    .filter(subscription => subscription.id === 'current' && profileByUid.has(subscription.uid))
  const activeSubscriptions = currentSubscriptions.filter(subscription => activeSubscription(subscription, now))

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  const todaysBookings = records.bookings.filter(booking => {
    const startsAt = eventTime(booking.startsAt)?.getTime()
    return booking.status === 'confirmed' && startsAt >= startOfToday && startsAt < startOfTomorrow
  }).length

  const openEnquiries = records.trialRequests.filter(request =>
    ['pending', 'contacted', 'approved'].includes(String(request.status ?? '').toLowerCase()))

  const planById = new Map(records.plans.map(plan => [plan.id, plan]))
  const planCounts = new Map()
  activeSubscriptions.forEach(subscription => {
    const plan = planById.get(subscription.planId)
    const id = subscription.planId || plan?.id || 'unknown'
    const name = plan?.name || subscription.planName || 'Plan details unavailable'
    const existing = planCounts.get(id) ?? { id, name, count: 0 }
    existing.count += 1
    planCounts.set(id, existing)
  })
  const distribution = [...planCounts.values()]
    .map(plan => ({ ...plan, percentage: activeSubscriptions.length ? plan.count / activeSubscriptions.length * 100 : 0 }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name))

  const activity = []
  records.profiles.forEach(profile => {
    const createdAt = eventTime(profile.createdAt)
    if (createdAt) {
      const name = profileName(profile)
      activity.push({ id: `profile-${profile.uid}`, title: 'New member registered', detail: `${name} joined FitZone`, time: createdAt, initials: initials(name) })
    }
  })
  records.bookings.forEach(booking => {
    const createdAt = eventTime(booking.createdAt)
    if (createdAt) {
      const name = profileName(profileByUid.get(booking.uid))
      activity.push({ id: `booking-${booking.id}`, title: 'Session booked', detail: `${name} · ${booking.sessionName || 'Session'}`, time: createdAt, initials: initials(name) })
    }
  })
  records.trialRequests.forEach(request => {
    const createdAt = eventTime(request.createdAt)
    if (createdAt) {
      const name = typeof request.fullName === 'string' && request.fullName.trim() ? request.fullName.trim() : 'Visitor'
      activity.push({ id: `trial-${request.id}`, title: 'Free-trial enquiry received', detail: `${name} · ${request.preferredVisit || 'Visit preference unavailable'}`, time: createdAt, initials: initials(name) })
    }
    const updatedAt = eventTime(request.updatedAt)
    if (updatedAt && createdAt && updatedAt.getTime() > createdAt.getTime() + 1000) {
      const name = typeof request.fullName === 'string' && request.fullName.trim() ? request.fullName.trim() : 'Visitor'
      activity.push({ id: `trial-update-${request.id}`, title: 'Free-trial enquiry updated', detail: `${name} · ${request.status || 'Status updated'}`, time: updatedAt, initials: initials(name) })
    }
  })
  records.membershipRequests.forEach(request => {
    const createdAt = eventTime(request.createdAt)
    if (createdAt) {
      const name = profileName(profileByUid.get(request.uid))
      activity.push({ id: `membership-request-${request.id}`, title: 'Membership request received', detail: `${name} · ${request.planName || 'Plan details unavailable'}`, time: createdAt, initials: initials(name) })
    }
  })
  activeSubscriptions.forEach(subscription => {
    const createdAt = eventTime(subscription.createdAt)
    if (createdAt) {
      const name = profileName(profileByUid.get(subscription.uid))
      activity.push({ id: `subscription-${subscription.uid}`, title: 'Membership activated', detail: `${name} · ${subscription.planName || 'Plan details unavailable'}`, time: createdAt, initials: initials(name) })
    }
  })

  return {
    activeMembers: activeSubscriptions.length,
    todaysBookings,
    openEnquiries: openEnquiries.length,
    distribution,
    activity: activity.sort((first, second) => second.time.getTime() - first.time.getTime()).slice(0, 6),
  }
}

export async function subscribeAdminOverview(user, onOverview, onError) {
  if (!user?.uid || !auth || auth.currentUser?.uid !== user.uid) {
    throw overviewError('admin/auth-required', 'Sign in with an administrator account to view dashboard data.')
  }
  const token = await getIdTokenResult(user, true)
  if (token.claims.admin !== true) {
    throw overviewError('admin/claim-required', 'This account does not have the trusted Firebase admin claim.')
  }
  if (!db) throw overviewError('firestore/not-configured', 'Cloud Firestore is unavailable.')

  const records = { profiles: [], subscriptions: [], bookings: [], trialRequests: [], membershipRequests: [], plans: [] }
  const loaded = new Set()
  const unsubscribers = []
  const subscribe = (key, reference, mapSnapshot) => {
    unsubscribers.push(onSnapshot(reference, snapshot => {
      records[key] = mapSnapshot(snapshot)
      loaded.add(key)
      if (loaded.size === Object.keys(records).length) onOverview(buildOverview(records))
    }, onError))
  }

  try {
    subscribe('profiles', collection(db, 'users'), snapshot => snapshot.docs.map(item => ({ uid: item.id, ...item.data() })))
    subscribe('subscriptions', collectionGroup(db, 'subscriptions'), snapshot => snapshot.docs
      .map(item => ({ id: item.id, uid: item.ref.parent.parent?.id, ...item.data() }))
      .filter(item => typeof item.uid === 'string'))
    subscribe('bookings', collection(db, 'bookings'), snapshot => snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
    subscribe('trialRequests', collection(db, 'trialRequests'), snapshot => snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
    subscribe('membershipRequests', collection(db, 'membershipRequests'), snapshot => snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
    subscribe('plans', collection(db, 'plans'), snapshot => snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
  } catch (error) {
    unsubscribers.forEach(unsubscribe => unsubscribe())
    throw error
  }
  return () => unsubscribers.forEach(unsubscribe => unsubscribe())
}
