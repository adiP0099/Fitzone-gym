import { useEffect, useState } from 'react'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check, MoreHorizontal, Plus, Search, Users, UserRound, CreditCard, MessageSquare, Settings, Filter, RefreshCw, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Eyebrow, FeatureList, SearchBox } from '../components/UI'
import { useAuth } from '../contexts/AuthContext'
import { getUserDisplayName, getUserInitials } from '../services/auth'
import { saveMemberProfile, subscribeAdminMembers } from '../services/profiles'
import { useMemberSubscription } from '../hooks/useMemberSubscription'
import { useMemberMembershipRequests } from '../hooks/useMemberMembershipRequests'
import { plans } from '../data/mock'
import { subscribeAdminOverview } from '../services/adminOverview'
import { getTrialRequestsForAdmin, updateTrialRequestStatus } from '../services/enquiries'
import { createPlan, getAdminPlans, importMissingPreviewPlans, setPlanActive, updatePlan } from '../services/plans'
import { getAdminMembershipRequests, reviewMembershipRequest } from '../services/membershipRequests'
import { createMemberBooking, createSession, getAdminBookings, getAdminMemberNames, getAdminSessions, setSessionActive, subscribeAvailableSessions } from '../services/bookings'
import { useMemberBookings } from '../hooks/useMemberBookings'
import { createTrainer, subscribeAdminTrainers, updateTrainer } from '../services/trainers'

function PageHeading({ eyebrow = 'MEMBER SPACE', title, text, action }) {
  return <div className="dash-page-heading"><div><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2><p>{text}</p></div>{action}</div>
}

function Metric({ label, value, note, icon: Icon, trend }) {
  return <Card className="metric-card"><div className="metric-head"><span>{label}</span><Icon size={18} /></div><b>{value}</b><div className="metric-note">{trend && <span className="trend"><TrendingUp size={13} />{trend}</span>}{note}</div></Card>
}

function formatMembershipDate(value) {
  const date = value?.toDate?.()
  return date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
}

function formatBookingDateTime(value) {
  const date = value?.toDate?.()
  return date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Date unavailable'
}

function getBookingStartDate(booking) {
  const date = booking?.startsAt?.toDate?.()
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null
}

function getConfirmedBookingsInCurrentMonth(bookings, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
  const uniqueBookings = new Map()
  bookings.forEach(booking => {
    const date = getBookingStartDate(booking)
    if (booking.status === 'confirmed' && date && date.getTime() >= start && date.getTime() < end) {
      uniqueBookings.set(booking.id, booking)
    }
  })
  return uniqueBookings.size
}

function getPlanForSubscription(subscription) {
  if (!subscription) return null
  return {
    id: subscription.planId,
    name: typeof subscription.planName === 'string' ? subscription.planName : '',
    price: typeof subscription.price === 'number' ? subscription.price : null,
    period: typeof subscription.period === 'string' ? subscription.period : '',
    features: Array.isArray(subscription.features) ? subscription.features.filter(item => typeof item === 'string') : [],
  }
}

function getSubscriptionDisplayStatus(subscription) {
  if (!subscription) return 'none'
  const status = typeof subscription.status === 'string' ? subscription.status.toLowerCase() : 'unknown'
  const expiry = subscription.currentPeriodEnd?.toDate?.()
  if (status === 'expired') return 'expired'
  if (status === 'active' && !(expiry instanceof Date && Number.isFinite(expiry.getTime()))) return 'expiry unavailable'
  if (status === 'active' && expiry.getTime() <= Date.now()) return 'expired'
  return status
}

export function MemberDashboard() {
  const { user, profile } = useAuth()
  const { subscription, loading: membershipLoading, error: membershipError } = useMemberSubscription()
  const { requests: membershipRequests, loading: requestsLoading, error: requestsError } = useMemberMembershipRequests()
  const { bookings, loading: bookingsLoading, error: bookingsError } = useMemberBookings()
  const displayName = (profile?.uid === user?.uid ? profile.displayName?.trim() : '')
    || user?.displayName?.trim()
    || user?.email?.split('@')[0]
    || 'Member'
  const subscriptionPlan = getPlanForSubscription(subscription)
  const renewalDate = formatMembershipDate(subscription?.currentPeriodEnd)
  const subscriptionStatus = getSubscriptionDisplayStatus(subscription)
  const pendingRequest = membershipRequests.find(request => request.status === 'pending')
  const latestRequest = membershipRequests[0]
  const now = Date.now()
  const upcomingBookings = bookings
    .filter(booking => booking.status === 'confirmed' && (getBookingStartDate(booking)?.getTime() ?? 0) >= now)
    .sort((first, second) => getBookingStartDate(first).getTime() - getBookingStartDate(second).getTime())
  const nextBooking = upcomingBookings[0]
  const monthlyBookings = getConfirmedBookingsInCurrentMonth(bookings)
  const membershipValue = membershipLoading ? 'Loading…'
    : membershipError ? 'Unavailable'
      : subscription ? subscriptionStatus === 'active'
        ? subscriptionPlan?.name || 'Plan details unavailable'
        : subscriptionStatus === 'expired' ? 'Expired' : subscriptionPlan?.name || 'Plan details unavailable'
        : requestsLoading ? 'Loading…'
          : requestsError ? 'Unavailable'
            : pendingRequest ? 'Request pending'
              : latestRequest?.status === 'rejected' ? 'Request rejected'
                : latestRequest?.status === 'approved' ? 'Request approved' : 'No membership'
  const membershipNote = membershipError ? membershipError
    : subscription ? `${subscriptionStatus}${renewalDate ? ` · Expires ${renewalDate}` : ''}`
      : membershipLoading ? 'Loading your membership'
        : requestsError ? requestsError
          : pendingRequest ? `${pendingRequest.planName} request is awaiting review.`
            : latestRequest?.status === 'rejected' ? `${latestRequest.planName} request was rejected.`
              : latestRequest?.status === 'approved' ? `${latestRequest.planName} was approved, but no current subscription record is available.`
                : 'No subscription or membership request is assigned to your account.'
  return <>
    <PageHeading title={`Good morning, ${displayName}.`} text="Your account and booking information at a glance." action={<Button to="/bookings"><Plus size={16} /> Book a session</Button>} />
    <div className="dashboard-metrics member-metrics"><Metric label="Membership" value={membershipValue} note={membershipNote} icon={CreditCard}/><Metric label="This month" value={bookingsLoading ? 'Loading…' : bookingsError ? 'Unavailable' : monthlyBookings} note={bookingsError || 'confirmed bookings scheduled this month'} icon={Activity} /><Metric label="Next booking" value={bookingsLoading ? 'Loading…' : bookingsError ? 'Unavailable' : nextBooking ? formatBookingDateTime(nextBooking.startsAt) : 'None scheduled'} note={bookingsError || nextBooking?.sessionName || 'No upcoming confirmed booking'} icon={CalendarDays} /></div>
    <div className="dash-columns"><Card className="dash-panel"><div className="panel-title"><div><Eyebrow>ON YOUR CALENDAR</Eyebrow><h3>Upcoming sessions</h3></div><Link to="/bookings">View all <ArrowRight size={14}/></Link></div>{bookingsLoading ? <p role="status">Loading your bookings…</p> : bookingsError ? <p className="form-error" role="alert">{bookingsError}</p> : upcomingBookings.length ? <div className="booking-list">{upcomingBookings.slice(0, 3).map(booking => { const startsAt = getBookingStartDate(booking); return <div className="booking-row" key={booking.id}><span className="date-box"><b>{startsAt.toLocaleDateString(undefined, { day: 'numeric' })}</b><small>{startsAt.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</small></span><div className="booking-info"><b>{booking.sessionName}</b><span>{booking.trainerName || 'Trainer not listed'} · {formatBookingDateTime(booking.startsAt)}</span></div><div className="booking-time"><Badge tone="green">{booking.status}</Badge></div></div>})}</div> : <EmptyState title="No upcoming bookings" text="Choose an available session to get started." action={<Button to="/bookings" variant="outline">Book a session</Button>} />}</Card><Card className="dash-panel workout-summary"><div className="panel-title"><div><Eyebrow>YOUR CONSISTENCY</Eyebrow><h3>Training this week</h3></div><Activity /></div><EmptyState title="Attendance not recorded" text="The current Firestore data does not store completed or attended workout sessions." /><Link to="/workouts" className="panel-link">See workout history <ArrowRight size={14}/></Link></Card></div>
    <Card className="member-plan-card"><div><Eyebrow>YOUR MEMBERSHIP</Eyebrow>{membershipLoading || requestsLoading ? <h3>Loading membership…</h3> : membershipError ? <p role="alert">{membershipError}</p> : requestsError && !subscription ? <p role="alert">{requestsError}</p> : subscription ? <><h3>{subscriptionPlan?.name ? `${subscriptionPlan.name} plan` : 'Plan details unavailable'}</h3><p>{subscriptionStatus}{renewalDate ? ` · Expires ${renewalDate}` : ''}</p></> : pendingRequest ? <><h3>Membership request pending</h3><p>{pendingRequest.planName} · ${pendingRequest.price} · Awaiting admin review.</p></> : latestRequest?.status === 'rejected' ? <><h3>Membership request rejected</h3><p>{latestRequest.planName} request was rejected.</p></> : latestRequest?.status === 'approved' ? <><h3>Membership request approved</h3><p>{latestRequest.planName} was approved, but no current subscription record is available.</p></> : <><h3>No membership</h3><p>There is no subscription or pending request for your account.</p></>}</div>{subscriptionPlan && !membershipError && <FeatureList items={subscriptionPlan.features} />}<Link to="/my-membership" className="inline-link">Manage membership <ArrowUpRight size={15}/></Link></Card>
    <p className="mock-disclaimer">Membership and booking details reflect records saved to your account. Attendance is not recorded in the current data model.</p>
  </>
}

export function ProfilePage() {
  const { user, profile, profileLoading, profileError, updateCurrentProfile } = useAuth()
  const currentProfile = profile?.uid === user?.uid ? profile : null
  const displayName = currentProfile?.displayName?.trim() || user?.displayName?.trim() || getUserDisplayName(user)
  const email = currentProfile?.email || user?.email || ''
  const { subscription, loading: subscriptionLoading, error: subscriptionError } = useMemberSubscription()
  const profileMembershipStatus = getSubscriptionDisplayStatus(subscription)
  const memberSince = formatMembershipDate(currentProfile?.createdAt)
  const profileMembershipLabel = subscriptionLoading ? 'Loading membership…'
    : subscriptionError ? 'Membership unavailable'
      : profileMembershipStatus === 'active' ? 'Active membership'
        : profileMembershipStatus === 'expired' ? 'Expired membership'
          : 'No active membership'
  const [form, setForm] = useState({ firstName: '', lastName: '', phoneNumber: '', fitnessGoals: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  useEffect(() => {
    const savedName = currentProfile?.displayName?.trim() || displayName
    const parts = savedName.split(/\s+/)
    setForm({
      firstName: currentProfile?.firstName ?? parts[0] ?? '',
      lastName: currentProfile?.lastName ?? parts.slice(1).join(' '),
      phoneNumber: currentProfile?.phoneNumber ?? '',
      fitnessGoals: currentProfile?.fitnessGoals ?? '',
    })
  }, [user?.uid, currentProfile, displayName])

  function handleFieldChange(event) {
    const { name, value } = event.target
    setForm(current => ({ ...current, [name]: value }))
    setSaveError('')
    setSaveSuccess('')
  }

  async function handleSave(event) {
    event.preventDefault()
    if (!user || saving) return
    setSaving(true)
    setSaveError('')
    setSaveSuccess('')
    try {
      const savedProfile = await saveMemberProfile(user, form)
      updateCurrentProfile(user.uid, savedProfile)
      setSaveSuccess('Your profile has been saved.')
    } catch (error) {
      if (import.meta.env.DEV) console.error('[FitZone] Could not save member profile', {
        uid: user.uid,
        code: error?.code ?? 'unknown',
        message: error?.message ?? String(error),
      })
      setSaveError(error?.code === 'permission-denied'
        ? 'Firestore denied this profile update. Confirm the local emulator is running with the current owner-only profile rules.'
        : error?.message || 'Your profile could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return <><PageHeading title="My profile" text="Your details, all in one place."/><Card className="profile-card"><div className="profile-hero"><span className="profile-avatar">{getUserInitials({ ...user, displayName })}</span><div><h3>{displayName}</h3><span>{profileLoading ? 'Loading registration date…' : memberSince ? `Member since ${memberSince}` : 'Registration date unavailable'}</span></div><Badge tone={profileMembershipStatus === 'active' ? 'green' : profileMembershipStatus === 'expired' ? 'amber' : 'gray'}>{profileMembershipLabel}</Badge></div>{profileLoading && <p className="form-note" role="status">Loading your saved profile...</p>}{profileError && <p className="form-error" role="alert">{profileError}</p>}{subscriptionError && <p className="form-error" role="alert">{subscriptionError}</p>}<form className="form-stack profile-form" onSubmit={handleSave}><div className="form-row"><label>First name<input name="firstName" value={form.firstName} onChange={handleFieldChange} maxLength="60" required /></label><label>Last name<input name="lastName" value={form.lastName} onChange={handleFieldChange} maxLength="60" /></label></div><div className="form-row"><label>Email address<input value={email} type="email" readOnly /></label><label>Phone number<input name="phoneNumber" value={form.phoneNumber} onChange={handleFieldChange} type="tel" maxLength="40" /></label></div><label>Fitness goals<textarea name="fitnessGoals" rows="3" maxLength="1000" value={form.fitnessGoals} onChange={handleFieldChange} /></label><Button type="submit" disabled={saving || profileLoading}>{saving ? 'Saving...' : 'Save changes'}</Button>{saveError && <p className="form-error" role="alert">{saveError}</p>}{saveSuccess && <p className="form-note" role="status">{saveSuccess}</p>}</form></Card></>
}
export function MemberMembership() {
  const [confirm, setConfirm] = useState(false)
  const { subscription, loading, error } = useMemberSubscription()
  const { requests, loading: requestsLoading, error: requestsError } = useMemberMembershipRequests()
  const subscriptionPlan = getPlanForSubscription(subscription)
  const startedDate = formatMembershipDate(subscription?.startedAt)
  const renewalDate = formatMembershipDate(subscription?.currentPeriodEnd)
  const displayStatus = getSubscriptionDisplayStatus(subscription)
  const active = displayStatus === 'active'
  const pendingRequest = requests.find(request => request.status === 'pending')
  const isLoading = loading || requestsLoading
  return <><PageHeading title="My membership" text="A quick look at your plan and member benefits."/>{isLoading ? <Card className="active-plan"><p role="status">Loading your membership…</p></Card> : error ? <Card className="active-plan"><p role="alert">{error}</p></Card> : requestsError && !subscription ? <Card className="active-plan"><p role="alert">{requestsError}</p></Card> : !subscription && pendingRequest ? <Card className="active-plan"><div className="active-plan-top"><div><Eyebrow>MEMBERSHIP REQUEST</Eyebrow><h3>{pendingRequest.planName}</h3><span>Submitted {formatMembershipDate(pendingRequest.createdAt) || 'date unavailable'} · Awaiting admin review.</span></div><Badge tone="amber">PENDING</Badge></div><div className="active-plan-price"><b>${pendingRequest.price}</b><span> Requested plan price · No payment has been processed.</span></div><div className="plan-management-actions"><Button to="/membership" variant="outline">View membership plans</Button></div></Card> : !subscription ? <Card className="active-plan"><div className="active-plan-top"><div><Eyebrow>MEMBERSHIP</Eyebrow><h3>No membership</h3><span>Your account has no assigned subscription or pending request.</span></div><Badge tone="gray">NONE</Badge></div><div className="plan-management-actions"><Button to="/membership" variant="outline">Compare plans</Button></div></Card> : <Card className="active-plan"><div className="active-plan-top"><div><Eyebrow>MEMBERSHIP DETAILS</Eyebrow><h3>{subscriptionPlan?.name || 'Plan details unavailable'}</h3><span>{subscriptionPlan?.period || 'Billing period unavailable'} · Started {startedDate || 'date unavailable'}</span></div><Badge tone={active ? 'green' : displayStatus === 'expired' ? 'amber' : 'gray'}>{displayStatus.toUpperCase()}</Badge></div><div className="active-plan-price">{subscriptionPlan?.price !== null && subscriptionPlan?.price !== undefined ? <><b>${subscriptionPlan.price}</b><span> / {subscriptionPlan.period || 'billing period unavailable'}</span></> : <span>Saved price unavailable</span>}{renewalDate && <span> · Expires {renewalDate}</span>}{!renewalDate && <span> · Expiry date unavailable</span>}</div>{subscriptionPlan?.features.length > 0 && <FeatureList items={subscriptionPlan.features} />}<div className="plan-management-actions"><Button to="/membership" variant="outline">Compare plans</Button>{active && <button className="btn btn-text" onClick={()=>setConfirm(true)}>Request cancellation</button>}</div></Card>}{confirm && <div className="modal-backdrop" role="presentation"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-title"><h3 id="cancel-title">Request to cancel?</h3><p>This page cannot cancel a membership. Contact FitZone staff to request cancellation.</p><div><button className="btn btn-outline" onClick={()=>setConfirm(false)}>Keep membership</button><button className="btn btn-primary" onClick={()=>setConfirm(false)}>Got it</button></div></div></div>}</>
}

export function BookingPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('All')
  const [view, setView] = useState('Upcoming')
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')
  const [selectedSession, setSelectedSession] = useState(null)
  const [busySessionId, setBusySessionId] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState('')
  const { bookings, loading: bookingsLoading, error: bookingsError } = useMemberBookings()

  useEffect(() => subscribeAvailableSessions(result => {
    setSessions(result)
    setSessionsLoading(false)
    setSessionsError('')
  }, error => {
    if (import.meta.env.DEV) console.error('[FitZone] Could not load available sessions', { code: error?.code ?? 'unknown', message: error?.message ?? String(error) })
    setSessions([])
    setSessionsLoading(false)
    setSessionsError('Available sessions could not be loaded. Please try again later.')
  }), [])

  const bookedSessionIds = new Set(bookings.filter(booking => booking.status !== 'cancelled').map(booking => booking.sessionId))
  const now = Date.now()
  const visibleBookings = bookings.filter(booking => {
    const startsAt = booking.startsAt?.toDate?.().getTime() ?? 0
    return view === 'Upcoming' ? startsAt >= now : startsAt < now
  }).filter(booking => filter === 'All' || booking.status === filter.toLowerCase())

  async function handleBooking() {
    if (!selectedSession || busySessionId) return
    setBusySessionId(selectedSession.id)
    setBookingError('')
    setBookingSuccess('')
    try {
      await createMemberBooking(user, selectedSession.id)
      setBookingSuccess(`${selectedSession.name} has been added to your bookings.`)
      setSelectedSession(null)
    } catch (error) {
      if (import.meta.env.DEV) console.error('[FitZone] Could not create member booking', { code: error?.code ?? 'unknown', message: error?.message ?? String(error) })
      setBookingError(error?.message || 'This session could not be booked. Refresh the list and try again.')
    } finally { setBusySessionId('') }
  }

  return <>
    <PageHeading title="Your bookings" text="Book an upcoming session and keep your routine moving." action={<Button to="/trial">Explore classes</Button>}/>
    {bookingSuccess && <p className="form-note" role="status">{bookingSuccess}</p>}
    <Card className="dash-panel"><div className="panel-title"><div><Eyebrow>AVAILABLE SESSIONS</Eyebrow><h3>Choose a session</h3></div></div>{sessionsLoading ? <p role="status">Loading available sessions…</p> : sessionsError ? <p className="form-error" role="alert">{sessionsError}</p> : sessions.length ? <div className="booking-cards">{sessions.map(session => {
      const alreadyBooked = bookedSessionIds.has(session.id)
      return <Card key={session.id} className="booking-card"><div className="booking-card-date"><CalendarDays size={18}/>{formatBookingDateTime(session.startsAt)}</div><h3>{session.name}</h3><p>{session.trainerName || 'Trainer not listed'}</p><Button disabled={alreadyBooked || busySessionId === session.id} onClick={() => { setSelectedSession(session); setBookingError('') }} variant={alreadyBooked ? 'text' : 'outline'}>{alreadyBooked ? 'Already booked' : 'Book session'}</Button></Card>
    })}</div> : <EmptyState title="No sessions available" text="There are no upcoming sessions open for booking right now." />}</Card>
    <div className="toolbar"><div className="segmented">{['Upcoming','Past'].map(value=><button key={value} className={view===value?'selected':''} onClick={()=>setView(value)}>{value}</button>)}</div><select value={filter} onChange={event=>setFilter(event.target.value)} aria-label="Filter bookings"><option>All</option><option>Confirmed</option></select></div>
    {bookingsLoading ? <Card><p role="status">Loading your bookings…</p></Card> : bookingsError ? <Card><p className="form-error" role="alert">{bookingsError}</p></Card> : visibleBookings.length ? <div className="booking-cards">{visibleBookings.map(booking=><Card key={booking.id} className="booking-card"><div className="booking-card-date"><CalendarDays size={18}/>{formatBookingDateTime(booking.startsAt)}</div><h3>{booking.sessionName}</h3><p>{booking.trainerName || 'Trainer not listed'}</p><Badge tone={booking.status==='confirmed'?'green':'gray'}>{booking.status}</Badge></Card>)}</div> : <Card><EmptyState title={view === 'Past' ? 'No past bookings' : 'No upcoming bookings'} text="Bookings you create will appear here." /></Card>}
    <p className="mock-disclaimer">Bookings displayed here are saved to your account in Cloud Firestore.</p>
    {selectedSession && <div className="modal-backdrop" role="presentation"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-confirm-title"><h3 id="booking-confirm-title">Book {selectedSession.name}?</h3><p>{formatBookingDateTime(selectedSession.startsAt)} · {selectedSession.trainerName || 'Trainer not listed'}</p>{bookingError && <p className="form-error" role="alert">{bookingError}</p>}<div><button className="btn btn-outline" type="button" disabled={busySessionId !== ''} onClick={() => setSelectedSession(null)}>Cancel</button><button className="btn btn-primary" type="button" disabled={busySessionId !== ''} onClick={handleBooking}>{busySessionId ? 'Booking…' : 'Confirm booking'}</button></div></div></div>}
  </>
}

export function WorkoutsPage() {
  return <><PageHeading title="Workout summary" text="Review completed training recorded to your account."/><Card className="dash-panel workout-history"><EmptyState title="Workout history is not available" text="This project does not currently store completed workouts, attendance, duration, or training streak records in Firestore." /></Card></>
}

export function AdminDashboard() {
  const { user, profile, profileLoading } = useAuth()
  const profileName = !profileLoading && profile?.uid === user?.uid ? profile.displayName?.trim() : ''
  const displayName = profileName || user?.displayName?.trim() || user?.email?.split('@')[0] || 'Admin'
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let unsubscribe
    setLoading(true)
    setError('')
    subscribeAdminOverview(user, data => {
      if (active) {
        setOverview(data)
        setLoading(false)
      }
    }, loadError => {
      if (import.meta.env.DEV) console.error('[FitZone] Could not load admin overview data', {
        operation: 'adminOverview.listen',
        code: loadError?.code ?? 'unknown',
        message: loadError?.message ?? String(loadError),
      })
      if (active) {
        setOverview(null)
        setLoading(false)
        setError(loadError?.code === 'admin/claim-required' || loadError?.code === 'permission-denied'
          ? 'Administrator access could not be verified. Confirm the trusted admin claim and current Firestore rules.'
          : 'Dashboard data could not be loaded. Check the local Firebase emulators and try again.')
      }
    }).then(stop => {
      if (active) unsubscribe = stop
      else stop()
    }).catch(loadError => {
      if (import.meta.env.DEV) console.error('[FitZone] Could not start admin overview listeners', {
        operation: 'adminOverview.start',
        code: loadError?.code ?? 'unknown',
        message: loadError?.message ?? String(loadError),
      })
      if (active) {
        setLoading(false)
        setError(loadError?.code === 'admin/claim-required' || loadError?.code === 'permission-denied'
          ? 'Administrator access could not be verified. Confirm the trusted admin claim and current Firestore rules.'
          : 'Dashboard data could not be loaded. Check the local Firebase emulators and try again.')
      }
    })
    return () => {
      active = false
      unsubscribe?.()
    }
  }, [user])

  function activityTime(date) {
    const elapsed = Math.max(0, Date.now() - date.getTime())
    const minutes = Math.floor(elapsed / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hr ago`
    const days = Math.floor(hours / 24)
    return days < 7 ? `${days} d ago` : date.toLocaleDateString()
  }

  const numberOrState = value => loading ? '…' : error ? '—' : value
  const distributionColors = ['orange', 'gray', 'dark']
  return <><PageHeading eyebrow="STUDIO SNAPSHOT" title={`Good morning, ${displayName}.`} text="Here’s what’s happening around FitZone today." action={<Button to="/admin/members">Manage members</Button>}/>{error && <p className="form-error" role="alert">{error}</p>}<div className="dashboard-metrics"><Metric label="Active members" value={numberOrState(overview?.activeMembers ?? 0)} note="members with an unexpired active subscription" icon={Users} /><Metric label="Today’s bookings" value={numberOrState(overview?.todaysBookings ?? 0)} note="confirmed sessions scheduled today" icon={CalendarDays} /><Metric label="Monthly revenue" value="Not available" note="No payment or transaction records are stored" icon={CreditCard} /><Metric label="Open enquiries" value={numberOrState(overview?.openEnquiries ?? 0)} note="trial requests not marked completed" icon={MessageSquare}/></div><div className="dash-columns"><Card className="dash-panel"><div className="panel-title"><div><Eyebrow>THE LATEST</Eyebrow><h3>Recent activity</h3></div><button className="icon-button" aria-label="Recent activity"><MoreHorizontal/></button></div>{loading ? <p role="status">Loading recent activity…</p> : error ? <p className="form-error">Activity is unavailable.</p> : overview.activity.length ? <div className="activity-list">{overview.activity.map(event=><div key={event.id} className="activity-row"><span className="mini-avatar">{event.initials}</span><div><b>{event.title}</b><span>{event.detail}</span></div><small>{activityTime(event.time)}</small></div>)}</div> : <EmptyState title="No recent activity" text="Registrations, bookings, and requests will appear here when recorded." />}<Link to="/admin/enquiries" className="panel-link">View enquiries <ArrowRight size={14}/></Link></Card><Card className="dash-panel"><div className="panel-title"><div><Eyebrow>MEMBERSHIP MIX</Eyebrow><h3>Plan distribution</h3></div><MoreHorizontal/></div><div className="distribution-total"><b>{numberOrState(overview?.activeMembers ?? 0)}</b><span>active members</span></div>{loading ? <p role="status">Loading membership data…</p> : error ? <p className="form-error">Membership distribution is unavailable.</p> : overview.distribution.length ? overview.distribution.map((plan, index)=><div className="distribution-row" key={plan.id}><div><span>{plan.name}</span><b>{plan.percentage.toFixed(1)}% · {plan.count}</b></div><div className="progress-track"><i className={`bar-${distributionColors[index % distributionColors.length]}`} style={{ width: `${plan.percentage}%` }} /></div></div>) : <EmptyState title="No active memberships" text="Plan distribution appears after subscriptions are assigned." />}<Link to="/admin/plans" className="panel-link">Manage plans <ArrowRight size={14}/></Link></Card></div></>
}

function Table({ headers, rows, emptyText = 'No records found.', onAction }) {
  return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}{onAction && <th>Action</th>}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}{onAction&&<td><button className="row-action" onClick={()=>onAction(row)}>View <ArrowUpRight size={14}/></button></td>}</tr>)}</tbody></table>{rows.length===0&&<EmptyState title="Nothing to show" text={emptyText}/>}</div>
}

export function AdminMembers() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All members')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let unsubscribe
    setLoading(true)
    setError('')
    subscribeAdminMembers(user, results => {
      if (active) {
        setMembers(results)
        setLoading(false)
      }
    }, loadError => {
      if (import.meta.env.DEV) console.error('[FitZone] Could not load admin member profiles', {
        code: loadError?.code ?? 'unknown',
        message: loadError?.message ?? String(loadError),
      })
      if (active) {
        setMembers([])
        setError(loadError?.code === 'admin/claim-required' || loadError?.code === 'permission-denied'
          ? 'Verified admin access is required to list member profiles. Check the admin token claim and Firestore rules.'
          : 'Member profiles could not be loaded. Check your connection and try again.')
        setLoading(false)
      }
    }).then(stop => {
      if (active) unsubscribe = stop
      else stop()
    }).catch(loadError => {
      if (import.meta.env.DEV) console.error('[FitZone] Could not start admin member profile listener', {
        code: loadError?.code ?? 'unknown',
        message: loadError?.message ?? String(loadError),
      })
      if (active) {
        setMembers([])
        setError(loadError?.code === 'admin/claim-required' || loadError?.code === 'permission-denied'
          ? 'Verified admin access is required to list member profiles.'
          : 'Member profiles could not be loaded. Check your connection and try again.')
        setLoading(false)
      }
    })
    return () => {
      active = false
      unsubscribe?.()
    }
  }, [user?.uid])

  const matchesStatus = member => status === 'All members'
    || (status === 'Active membership' && member.membershipStatus === 'active')
    || (status === 'Expired membership' && member.membershipStatus === 'expired')
    || (status === 'No membership' && member.membershipStatus === 'none')
  const shown = members.filter(member => matchesStatus(member)
    && `${member.displayName ?? ''} ${member.email ?? ''} ${member.subscription?.planName ?? member.subscription?.planId ?? ''}`
      .toLowerCase().includes(query.toLowerCase()))
  const memberName = member => member.displayName?.trim() || member.email?.split('@')[0] || 'Member'
  const memberSince = member => {
    const date = member.createdAt?.toDate?.()
    return date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  }
  const membershipLabel = member => member.membershipStatus === 'none'
    ? 'No membership'
    : member.membershipStatus.charAt(0).toUpperCase() + member.membershipStatus.slice(1)

  return <><PageHeading eyebrow="MEMBERS" title="Member management" text="Find and review FitZone member profiles." action={<Button onClick={()=>window.alert('Invite flow is a UI preview only.')}>Invite a member</Button>}/><div className="table-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Search members..." /><select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filter members"><option>All members</option><option>Active membership</option><option>Expired membership</option><option>No membership</option></select><span>{loading ? 'Loading…' : `${shown.length} members`}</span></div>{error ? <Card className="table-card"><p className="form-error" role="alert">{error}</p></Card> : loading ? <Card className="table-card"><p role="status">Loading registered members…</p></Card> : <Card className="table-card"><Table headers={['Member','Plan','Status','Member since']} rows={shown.map(member => [<div className="table-person"><span className="mini-avatar">{getUserInitials({ displayName: memberName(member) })}</span><div><b>{memberName(member)}</b><small>{member.email || 'Email unavailable'}</small></div></div>,member.subscription?.planName || member.subscription?.planId || '—',<Badge tone={member.membershipStatus === 'active' ? 'green' : member.membershipStatus === 'expired' ? 'amber' : 'gray'}>{membershipLabel(member)}</Badge>,memberSince(member)])} emptyText={members.length ? 'No members match your search or membership filter.' : 'No registered member profiles exist in Firestore yet.'} /></Card>}</>
}

export function AdminTrainers() {
  const { user } = useAuth()
  const [trainers, setTrainers] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All trainers')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    let unsubscribe
    setLoading(true)
    setError('')
    subscribeAdminTrainers(user, results => {
      if (active) {
        setTrainers(results)
        setLoading(false)
      }
    }, loadError => {
      if (import.meta.env.DEV) console.error('[FitZone] Could not load admin trainer records', {
        code: loadError?.code ?? 'unknown',
        message: loadError?.message ?? String(loadError),
      })
      if (active) {
        setTrainers([])
        setError(loadError?.code === 'permission-denied'
          ? 'Firestore denied access. Verify the admin claim and publish the current rules to the local emulator.'
          : 'Trainer records could not be loaded. Check your connection and try again.')
        setLoading(false)
      }
    }).then(stop => {
      if (active) unsubscribe = stop
      else stop()
    }).catch(loadError => {
      if (import.meta.env.DEV) console.error('[FitZone] Could not start trainer listener', {
        code: loadError?.code ?? 'unknown',
        message: loadError?.message ?? String(loadError),
      })
      if (active) {
        setTrainers([])
        setError(loadError?.message || 'Verified admin access is required to manage trainers.')
        setLoading(false)
      }
    })
    return () => {
      active = false
      unsubscribe?.()
    }
  }, [user?.uid])

  const shown = trainers.filter(trainer => {
    const matchesStatus = statusFilter === 'All trainers'
      || (statusFilter === 'Published' && trainer.isPublished)
      || (statusFilter === 'Unpublished' && !trainer.isPublished)
    const searchable = `${trainer.displayName ?? ''} ${(trainer.specialties ?? []).join(' ')} ${trainer.bio ?? ''}`
    return matchesStatus && searchable.toLowerCase().includes(query.toLowerCase())
  })

  function openTrainerEditor(trainer = null) {
    setFormError('')
    setNotice('')
    setEditor(trainer ? {
      id: trainer.id,
      displayName: trainer.displayName ?? '',
      specialties: Array.isArray(trainer.specialties) ? trainer.specialties.join(', ') : '',
      bio: trainer.bio ?? '',
      isPublished: trainer.isPublished === true,
    } : { id: '', displayName: '', specialties: '', bio: '', isPublished: true })
  }

  async function handleSaveTrainer(event) {
    event.preventDefault()
    if (!editor || saving) return
    const formData = new FormData(event.currentTarget)
    const input = {
      displayName: formData.get('displayName'),
      specialties: String(formData.get('specialties') ?? '').split(/[\n,]/),
      bio: formData.get('bio'),
      isPublished: formData.get('isPublished') === 'on',
    }
    setSaving(true)
    setFormError('')
    setNotice('')
    try {
      if (editor.id) await updateTrainer(user, editor.id, input)
      else await createTrainer(user, input)
      setEditor(null)
      setNotice(editor.id ? 'Trainer profile updated.' : 'Trainer profile added.')
    } catch (saveError) {
      if (import.meta.env.DEV) console.error('[FitZone] Could not save trainer profile', {
        code: saveError?.code ?? 'unknown',
        message: saveError?.message ?? String(saveError),
      })
      setFormError(saveError?.message || 'Trainer profile could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const initials = trainer => (trainer.displayName ?? 'T').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

  return <><PageHeading eyebrow="COACHING TEAM" title="Trainer management" text="Manage trainer profiles saved in Firestore." action={<Button onClick={() => openTrainerEditor()}>Add trainer</Button>}/><div className="table-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Search trainers..."/><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter trainers"><option>All trainers</option><option>Published</option><option>Unpublished</option></select><span>{loading ? 'Loading…' : `${shown.length} trainers`}</span></div>{notice && <p className="form-note" role="status">{notice}</p>}{error ? <Card className="table-card"><p className="form-error" role="alert">{error}</p></Card> : loading ? <Card className="table-card"><p role="status">Loading trainer profiles…</p></Card> : shown.length ? <div className="admin-trainer-grid">{shown.map(trainer => <Card key={trainer.id} className="admin-trainer-card"><div className="mini-avatar">{initials(trainer)}</div><div><h3>{trainer.displayName}</h3>{trainer.specialties?.length > 0 && <p>{trainer.specialties.join(' · ')}</p>}{trainer.bio && <span>{trainer.bio}</span>}</div><button className="icon-button" aria-label={`Edit ${trainer.displayName}`} onClick={() => openTrainerEditor(trainer)}><MoreHorizontal/></button><div className="trainer-card-footer"><Badge tone={trainer.isPublished ? 'green' : 'gray'}>{trainer.isPublished ? 'Published' : 'Unpublished'}</Badge><button className="row-action" onClick={() => openTrainerEditor(trainer)}>Edit profile</button></div></Card>)}</div> : <Card><EmptyState title={trainers.length ? 'No trainers match these filters' : 'No trainer profiles yet'} text={trainers.length ? 'Try a different search or publication filter.' : 'Add a trainer profile to create the first Firestore trainer record.'} /></Card>}{editor && <div className="modal-backdrop" role="presentation"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="trainer-editor-title"><h3 id="trainer-editor-title">{editor.id ? 'Edit trainer' : 'Add trainer'}</h3><form className="form-stack profile-form" onSubmit={handleSaveTrainer}><label>Trainer name<input name="displayName" required minLength="2" maxLength="100" defaultValue={editor.displayName}/></label><label>Specializations <span>(comma or line separated)</span><textarea name="specialties" required rows="2" defaultValue={editor.specialties}/></label><label>Bio<textarea name="bio" rows="3" maxLength="1000" defaultValue={editor.bio}/></label><label className="plan-checkbox"><input name="isPublished" type="checkbox" defaultChecked={editor.isPublished}/> Published on the public trainer list</label>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="plan-management-actions"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : editor.id ? 'Save changes' : 'Add trainer'}</Button><Button type="button" variant="outline" disabled={saving} onClick={() => setEditor(null)}>Cancel</Button></div></form></div></div>}</>
}

const blankPlanDraft = sortOrder => ({
  name: '',
  description: '',
  price: '',
  period: 'month',
  features: '',
  featured: false,
  active: true,
  sortOrder: String(sortOrder),
})

function makePlanDraft(plan) {
  return {
    name: plan.name,
    description: plan.description,
    price: String(plan.price),
    period: plan.period,
    features: plan.features.join('\n'),
    featured: plan.featured,
    active: plan.active,
    sortOrder: String(plan.sortOrder),
  }
}

function getPlanErrorMessage(error) {
  if (error?.code === 'admin/claim-required' || error?.code === 'admin/auth-required') {
    return 'This action requires a verified FitZone administrator account.'
  }
  if (error?.code === 'plans/name-exists') return error.message
  if (error?.code === 'plans/id-exists') return error.message
  if (error?.code === 'plans/invalid-input') return error.message
  if (error?.code === 'permission-denied' || error?.code === 'firestore/permission-denied') {
    return 'Firestore denied this plan change. Confirm the latest Firestore rules are published and this account has the admin claim.'
  }
  if (error?.code === 'firestore/not-configured') return 'Cloud Firestore is unavailable. Check the Firebase configuration.'
  return 'The plan could not be saved. Please try again.'
}

export function AdminPlans() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editorError, setEditorError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [editor, setEditor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [updatingId, setUpdatingId] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getAdminPlans(user).then(result => {
      if (active) setPlans(result)
    }).catch(loadError => {
      if (import.meta.env.DEV) {
        console.error('[FitZone] Could not load admin membership plans', {
          code: loadError?.code ?? 'unknown',
          message: loadError?.message ?? String(loadError),
        })
      }
      if (active) setError(getPlanErrorMessage(loadError))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [reloadKey, user])

  async function savePlan(event) {
    event.preventDefault()
    if (saving) return
    const formData = new FormData(event.currentTarget)
    const input = {
      name: formData.get('name'),
      description: formData.get('description'),
      price: formData.get('price'),
      period: formData.get('period'),
      features: String(formData.get('features') ?? '').split('\n').map(feature => feature.trim()).filter(Boolean),
      featured: formData.has('featured'),
      active: formData.has('active'),
      sortOrder: formData.get('sortOrder'),
    }
    setSaving(true)
    setError('')
    setEditorError('')
    setNotice('')
    try {
      if (editor.plan) {
        await updatePlan(user, editor.plan.id, input)
        setNotice(`${input.name} was updated.`)
      } else {
        await createPlan(user, input)
        setNotice(`${input.name} was created.`)
      }
      setEditor(null)
      setReloadKey(key => key + 1)
    } catch (saveError) {
      if (import.meta.env.DEV) {
        console.error('[FitZone] Could not save membership plan', {
          code: saveError?.code ?? 'unknown',
          message: saveError?.message ?? String(saveError),
        })
      }
      setEditorError(getPlanErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  async function togglePlan(plan) {
    if (updatingId) return
    setUpdatingId(plan.id)
    setError('')
    setNotice('')
    try {
      const updatedPlan = await setPlanActive(user, plan, !plan.active)
      setPlans(currentPlans => currentPlans.map(current => current.id === plan.id ? { ...current, ...updatedPlan } : current))
      setNotice(`${plan.name} is now ${updatedPlan.active ? 'active' : 'inactive'}.`)
    } catch (updateError) {
      if (import.meta.env.DEV) {
        console.error('[FitZone] Could not update membership plan status', {
          code: updateError?.code ?? 'unknown',
          message: updateError?.message ?? String(updateError),
        })
      }
      setError(getPlanErrorMessage(updateError))
    } finally {
      setUpdatingId('')
    }
  }

  async function importPreviewPlans() {
    if (importing) return
    setImporting(true)
    setError('')
    setNotice('')
    try {
      const result = await importMissingPreviewPlans(user)
      setNotice(`Import complete: ${result.created} added, ${result.skipped} already present. Existing plans were not overwritten.`)
      setReloadKey(key => key + 1)
    } catch (importError) {
      if (import.meta.env.DEV) {
        console.error('[FitZone] Could not import missing preview plans', {
          code: importError?.code ?? 'unknown',
          message: importError?.message ?? String(importError),
        })
      }
      setError(getPlanErrorMessage(importError))
    } finally {
      setImporting(false)
    }
  }

  return <>
    <PageHeading eyebrow="MEMBERSHIPS" title="Membership plans" text="Manage the plans shown to FitZone members." action={<div className="admin-plan-actions"><button className="btn btn-outline" type="button" onClick={importPreviewPlans} disabled={importing}>{importing ? 'Importing…' : 'Import missing preview plans'}</button><Button onClick={() => { setError(''); setEditorError(''); setEditor({ plan: null, draft: blankPlanDraft(plans.length) }) }}>Create a plan</Button></div>} />
    {notice && <p className="form-note" role="status">{notice}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <Card><p role="status">Loading membership plans…</p></Card> : plans.length === 0 && !error ? <Card><EmptyState title="No saved plans yet" text="Import the three existing preview plans to create missing Firestore records. Existing records will be kept unchanged." action={<button className="btn btn-outline" type="button" onClick={importPreviewPlans} disabled={importing}>{importing ? 'Importing…' : 'Import missing preview plans'}</button>} /></Card> : plans.length > 0 ? <div className="admin-plans-grid">{plans.map(plan => <Card className="admin-plan-card" key={plan.id}><div className="plan-admin-head"><span className="plan-number">PLAN / {plan.name.toUpperCase()}</span><button className={`toggle ${plan.active ? 'on' : ''}`} onClick={() => togglePlan(plan)} disabled={updatingId === plan.id || Boolean(updatingId)} role="switch" aria-checked={plan.active} aria-label={`${plan.active ? 'Deactivate' : 'Activate'} ${plan.name} plan`}><i /></button></div><h3>{plan.name}</h3><p>{plan.description}</p><div className="plan-price"><b>${plan.price}</b><span> / {plan.period}</span></div><FeatureList items={plan.features} /><div className="plan-admin-foot"><Badge tone={plan.active ? 'green' : 'gray'}>{plan.active ? 'Active' : 'Inactive'}</Badge><button className="plan-edit-button" type="button" onClick={() => { setError(''); setEditorError(''); setEditor({ plan, draft: makePlanDraft(plan) }) }}>Edit plan</button></div></Card>)}</div> : null}
    <p className="mock-disclaimer">Changes are saved to Firestore. No subscriptions or payments are created in this phase.</p>
    {editor && <div className="modal-backdrop" role="presentation"><div className="confirm-dialog plan-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="plan-editor-title"><h3 id="plan-editor-title">{editor.plan ? 'Edit membership plan' : 'Create membership plan'}</h3>{editorError && <p className="form-error" role="alert">{editorError}</p>}<form className="form-stack plan-editor-form" onSubmit={savePlan}>
      <label>Plan name<input name="name" required minLength="2" maxLength="60" defaultValue={editor.draft.name} /></label>
      <label>Description<textarea name="description" required minLength="1" maxLength="500" rows="2" defaultValue={editor.draft.description} /></label>
      <div className="form-row"><label>Price<input name="price" type="number" required min="0" max="10000" step="0.01" defaultValue={editor.draft.price} /></label><label>Duration<select name="period" defaultValue={editor.draft.period}><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select></label></div>
      <label>Benefits <span>(one per line, up to 10)</span><textarea name="features" required rows="5" defaultValue={editor.draft.features} /></label>
      <label>Display order<input name="sortOrder" type="number" required min="0" max="999" step="1" defaultValue={editor.draft.sortOrder} /></label>
      <label className="plan-checkbox"><input name="featured" type="checkbox" defaultChecked={editor.draft.featured} /> Show as member favorite</label>
      <label className="plan-checkbox"><input name="active" type="checkbox" defaultChecked={editor.draft.active} /> Active and visible on public plans page</label>
      <div className="plan-editor-actions"><button className="btn btn-outline" type="button" onClick={() => setEditor(null)} disabled={saving}>Cancel</button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : editor.plan ? 'Save changes' : 'Create plan'}</Button></div>
    </form></div></div>}
  </>
}

export function AdminBookings() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [sessions, setSessions] = useState([])
  const [bookings, setBookings] = useState([])
  const [memberNames, setMemberNames] = useState({})
  const [memberNamesLoading, setMemberNamesLoading] = useState(true)
  const [memberNamesError, setMemberNamesError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setMemberNamesLoading(true)
    setMemberNamesError('')
    setMemberNames({})
    Promise.all([getAdminSessions(user), getAdminBookings(user)]).then(([sessionResults, bookingResults]) => {
      if (active) { setSessions(sessionResults); setBookings(bookingResults) }
      return getAdminMemberNames(user, bookingResults.map(booking => booking.uid))
        .then(names => { if (active) setMemberNames(names) })
        .catch(profileError => {
          if (import.meta.env.DEV) console.error('[FitZone] Could not load booking member names', { code: profileError?.code ?? 'unknown', message: profileError?.message ?? String(profileError) })
          if (active) setMemberNamesError('Member names could not be loaded. Verify admin profile access and the Firestore rules.')
        })
        .finally(() => { if (active) setMemberNamesLoading(false) })
    }).catch(loadError => {
      if (import.meta.env.DEV) console.error('[FitZone] Could not load admin bookings', { code: loadError?.code ?? 'unknown', message: loadError?.message ?? String(loadError) })
      if (active) setError(loadError?.code === 'admin/claim-required' || loadError?.code === 'permission-denied'
        ? 'This account does not have verified admin access to booking records.'
        : 'Booking schedule could not be loaded. Please try again.')
      if (active) setMemberNamesLoading(false)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.uid, refreshKey])

  const shown = sessions.filter(session => `${session.name} ${session.trainerName}`.toLowerCase().includes(query.toLowerCase()))

  async function handleCreateSession(event) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setSaving(true)
    setActionError('')
    try {
      await createSession(user, {
        name: formData.get('name'),
        trainerName: formData.get('trainerName'),
        startsAt: new Date(formData.get('startsAt')),
      })
      form.reset()
      setShowForm(false)
      setRefreshKey(key => key + 1)
    } catch (createError) {
      if (import.meta.env.DEV) console.error('[FitZone] Could not create session', { code: createError?.code ?? 'unknown', message: createError?.message ?? String(createError) })
      setActionError(createError?.message || 'The session could not be saved.')
    } finally { setSaving(false) }
  }

  async function handleToggleSession(session) {
    setActionError('')
    try {
      await setSessionActive(user, session.id, !session.active)
      setRefreshKey(key => key + 1)
    } catch (toggleError) {
      if (import.meta.env.DEV) console.error('[FitZone] Could not update session availability', { code: toggleError?.code ?? 'unknown', message: toggleError?.message ?? String(toggleError) })
      setActionError(toggleError?.message || 'Session availability could not be updated.')
    }
  }

  return <>
    <PageHeading eyebrow="SCHEDULE" title="Booking management" text="Publish upcoming sessions and review member bookings." action={<div className="admin-plan-actions"><Button variant="outline" onClick={() => setRefreshKey(key => key + 1)} disabled={loading}>Refresh</Button><Button onClick={() => { setActionError(''); setShowForm(value => !value) }}>Add session</Button></div>} />
    {actionError && <p className="form-error" role="alert">{actionError}</p>}
    {showForm && <Card className="settings-card"><Eyebrow>NEW SESSION</Eyebrow><form className="form-stack profile-form" onSubmit={handleCreateSession}><label>Session name<input name="name" minLength="3" maxLength="100" required /></label><label>Trainer name (optional)<input name="trainerName" maxLength="100" /></label><label>Date and time<input name="startsAt" type="datetime-local" required /></label><div className="plan-management-actions"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save session'}</Button><Button type="button" variant="outline" disabled={saving} onClick={() => setShowForm(false)}>Cancel</Button></div></form></Card>}
    <div className="table-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Search sessions..." /><span>{shown.length} sessions</span></div>
    {loading ? <Card className="table-card"><p role="status">Loading booking schedule…</p></Card> : error ? <Card className="table-card"><p className="form-error" role="alert">{error}</p></Card> : <Card className="table-card"><Table headers={['Session','Trainer','Date & time','Availability']} rows={shown.map(session => [<b>{session.name}</b>,session.trainerName || 'Not listed',formatBookingDateTime(session.startsAt),<div className="membership-review-actions"><Badge tone={session.active ? 'green' : 'gray'}>{session.active ? 'Available' : 'Inactive'}</Badge><button className="row-action" onClick={() => handleToggleSession(session)}>{session.active ? 'Deactivate' : 'Activate'}</button></div>])} emptyText="No sessions have been published yet. Add a future session to make it available to members." /></Card>}
    <PageHeading eyebrow="MEMBER RESERVATIONS" title="Saved bookings" text="Bookings are private to each member and visible to trusted admins." />
    {memberNamesError && <p className="form-error" role="alert">{memberNamesError}</p>}
    {loading ? <Card className="table-card"><p role="status">Loading member bookings…</p></Card> : !error ? <Card className="table-card"><Table headers={['Member','Session','Trainer','Date & time','Status']} rows={bookings.map(booking => [memberNamesLoading ? 'Loading member name...' : memberNames[booking.uid] || 'Member profile unavailable',booking.sessionName,booking.trainerName || 'Not listed',formatBookingDateTime(booking.startsAt),<Badge tone={booking.status === 'confirmed' ? 'green' : 'gray'}>{booking.status}</Badge>])} emptyText="No member bookings have been created." /></Card> : null}
    <p className="mock-disclaimer">Only session and booking records saved to Cloud Firestore appear here.</p>
  </>
}

export function AdminEnquiries() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('All requests')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [busyId, setBusyId] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getTrialRequestsForAdmin(user)
      .then(results => { if (active) setRequests(results) })
      .catch(requestError => {
        if (import.meta.env.DEV) {
          console.error('[FitZone] Could not load admin trial requests', {
            operation: 'trialRequests.list',
            code: requestError?.code ?? 'unknown',
            message: requestError?.message ?? String(requestError),
          })
        }
        if (active) {
          setRequests([])
          setError(requestError?.code === 'admin/claim-required'
            ? 'This account does not have verified administrator access.'
            : requestError?.code === 'permission-denied'
              ? 'Firestore denied access. Verify the admin token claim and publish the current Firestore rules.'
              : 'Trial requests could not be loaded. Check your connection and try again.')
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, refreshKey])

  async function handleStatusChange(request, status) {
    if (busyId || status === request.status) return
    setBusyId(request.id)
    setActionError('')
    setActionSuccess('')
    try {
      await updateTrialRequestStatus(user, request.id, status)
      setRequests(current => current.map(item => item.id === request.id ? { ...item, status } : item))
      setActionSuccess(`Status updated to ${status}.`)
    } catch (statusError) {
      if (import.meta.env.DEV) console.error('[FitZone] Could not update trial request status', {
        operation: 'trialRequests.updateStatus',
        code: statusError?.code ?? 'unknown',
        message: statusError?.message ?? String(statusError),
      })
      setActionError(statusError?.code === 'permission-denied'
        ? 'Firestore denied this update. Confirm the admin claim and publish the current Firestore rules.'
        : statusError?.code === 'admin/claim-required'
          ? 'This account does not have verified administrator access.'
          : 'The status could not be saved. Check your connection and try again.')
    } finally {
      setBusyId('')
    }
  }

  const shown = requests.filter(request => {
    const matchesStatus = filter === 'All requests' || request.status?.toLowerCase() === filter
    const searchable = [request.fullName, request.email, request.phone, request.preferredVisit, request.goals, request.status]
      .filter(Boolean).join(' ').toLowerCase()
    return matchesStatus && searchable.includes(query.toLowerCase())
  })
  function formatSubmittedAt(value) {
    const date = value?.toDate?.()
    return date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  }

  const statusTone = status => ({ pending: 'amber', contacted: 'gray', approved: 'green', completed: 'green' })[status] ?? 'gray'
  return <><PageHeading eyebrow="INBOX" title="Enquiry management" text="Review free-trial requests from the FitZone community." action={<Button onClick={() => setRefreshKey(key => key + 1)} disabled={loading || Boolean(busyId)}><RefreshCw size={16} />{loading ? 'Refreshing' : 'Refresh requests'}</Button>}/><div className="table-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Search trial requests..." /><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter trial requests"><option>All requests</option><option value="pending">Pending</option><option value="contacted">Contacted</option><option value="approved">Approved</option><option value="completed">Completed</option></select><span>{loading ? 'Loading…' : `${shown.length} requests`}</span></div>{actionError && <p className="form-error" role="alert">{actionError}</p>}{actionSuccess && <p className="form-note" role="status">{actionSuccess}</p>}{loading ? <Card className="table-card"><p role="status">Loading trial requests…</p></Card> : error ? <Card className="table-card"><p className="form-error" role="alert">{error}</p></Card> : <Card className="table-card"><Table headers={['Requester','Phone','Preferred visit','Goals','Submitted','Status']} rows={shown.map(request=>[<div className="table-person"><span className="mini-avatar">{(request.fullName ?? '?').split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase()}</span><div><b>{request.fullName ?? '—'}</b><small>{request.email ?? '—'}</small></div></div>,request.phone ?? '—',request.preferredVisit ?? '—',request.goals ?? '—',formatSubmittedAt(request.createdAt),<div className="membership-review-actions"><Badge tone={statusTone(request.status)}>{request.status ?? 'Unknown'}</Badge><select className="inline-select" aria-label={`Status for ${request.fullName ?? 'trial request'}`} value={request.status ?? 'pending'} disabled={Boolean(busyId) || !['pending', 'contacted', 'approved', 'completed'].includes(request.status)} onChange={event => handleStatusChange(request, event.target.value)}>{busyId === request.id && <option value={request.status}>Saving…</option>}<option value="pending">Pending</option><option value="contacted">Contacted</option><option value="approved">Approved</option><option value="completed">Completed</option></select></div>])} emptyText="No trial requests match your search." /></Card>}</>
}

export function AdminMembershipRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [busyId, setBusyId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getAdminMembershipRequests(user).then(results => { if (active) setRequests(results) }).catch(loadError => {
      if (import.meta.env.DEV) console.error('[FitZone] Could not load admin membership requests', { operation: 'membershipRequests.list.admin', code: loadError?.code ?? 'unknown', message: loadError?.message ?? String(loadError) })
      if (active) { setRequests([]); setError(loadError?.code === 'permission-denied' ? 'Firestore denied access. Confirm this account has the trusted admin claim and publish the current rules.' : 'Membership requests could not be loaded. Check your connection and try again.') }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, refreshKey])

  async function handleReview(request, status) {
    if (busyId) return
    setBusyId(request.id)
    setActionError('')
    setActionSuccess('')
    try {
      await reviewMembershipRequest(user, request.id, status)
      setActionSuccess(status === 'approved'
        ? `Approved ${request.planName}; the subscription was assigned. No payment was processed.`
        : `Rejected ${request.planName}. No subscription was created.`)
      setRefreshKey(key => key + 1)
    } catch (reviewError) {
      if (import.meta.env.DEV) console.error('[FitZone] Could not review membership request', { operation: 'membershipRequests.review', code: reviewError?.code ?? 'unknown', message: reviewError?.message ?? String(reviewError) })
      setActionError(reviewError?.code === 'functions/failed-precondition' || reviewError?.code === 'failed-precondition' || reviewError?.code === 'functions/already-exists'
        ? reviewError.message
        : reviewError?.code === 'permission-denied' || reviewError?.code === 'functions/permission-denied'
          ? 'This account does not have verified administrator access.'
          : 'The request could not be updated. Check the secure approval service and try again.')
    } finally { setBusyId('') }
  }

  function submittedAt(value) {
    const date = value?.toDate?.()
    return date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  }

  return <><PageHeading eyebrow="MEMBERSHIP" title="Membership requests" text="Review member requests. Approval assigns an active membership after admin review. No payment is processed." action={<Button onClick={() => setRefreshKey(key => key + 1)} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh requests'}</Button>} />
    {actionError && <p className="form-error" role="alert">{actionError}</p>}
    {actionSuccess && <p className="form-note" role="status">{actionSuccess}</p>}
    {loading ? <Card className="table-card"><p role="status">Loading membership requests…</p></Card> : error ? <Card className="table-card"><p className="form-error" role="alert">{error}</p></Card> : <Card className="table-card"><Table headers={['Member','Plan','Requested price','Submitted','Status','Review']} rows={requests.map(request => [<div className="table-person"><span className="mini-avatar">{(request.email ?? '?')[0]?.toUpperCase()}</span><div><b>{request.email ?? '—'}</b><small>{request.uid}</small></div></div>,request.planName ?? '—',`$${request.price}`,submittedAt(request.createdAt),<Badge tone={request.status === 'pending' ? 'amber' : request.status === 'approved' ? 'green' : 'gray'}>{request.status ?? 'Unknown'}</Badge>,request.status === 'pending' ? <div className="membership-review-actions"><button className="row-action" disabled={Boolean(busyId)} onClick={() => handleReview(request, 'approved')}>{busyId === request.id ? 'Saving…' : 'Approve'}</button><button className="row-action" disabled={Boolean(busyId)} onClick={() => handleReview(request, 'rejected')}>Reject</button></div> : '—'])} emptyText="No membership requests have been submitted." /></Card>}
  </>
}

export function AdminSettings() {
  const [saved,setSaved]=useState(false)
  const [maintenance,setMaintenance]=useState(false)
  return <><PageHeading eyebrow="STUDIO PREFERENCES" title="Settings" text="Review studio details and preview preferences."/><div className="settings-grid"><Card className="settings-card"><Eyebrow>STUDIO DETAILS</Eyebrow><h3>Public information</h3><form className="form-stack profile-form" onSubmit={e=>{e.preventDefault();setSaved(true)}}><label>Studio name<input defaultValue="FitZone Brooklyn" /></label><label>Contact email<input defaultValue="hello@fitzone.example" type="email" /></label><label>Phone number<input defaultValue="(718) 555-0192" /></label><label>Address<input defaultValue="1200 Wellness Avenue, Brooklyn, NY 11201" /></label><Button type="submit">{saved?'Preview updated':'Save changes'}</Button>{saved&&<p className="form-note">Preview only — changes are not saved.</p>}</form></Card><Card className="settings-card"><Eyebrow>PREVIEW CONTROLS</Eyebrow><h3>Workspace preferences</h3><div className="setting-item"><div><b>Maintenance mode</b><p>Show a maintenance notice in this local preview.</p></div><button className={`toggle ${maintenance?'on':''}`} onClick={()=>setMaintenance(!maintenance)} role="switch" aria-checked={maintenance} aria-label="Toggle maintenance preview"><i /></button></div><div className="setting-item"><div><b>Mock data notice</b><p>Sample content is always marked as preview data.</p></div><Badge>Always on</Badge></div><div className="setting-item"><div><b>Connected services</b><p>Admin-approved memberships use a trusted Firebase function. Payments are not connected.</p></div><Badge tone="gray">No payments</Badge></div></Card></div><p className="mock-disclaimer">Settings are local UI state and are not persisted.</p></>
}

