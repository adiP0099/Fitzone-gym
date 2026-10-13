import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'
import { About, Contact, Facilities, Home, Membership, Trainers, Trial } from './pages/PublicPages'
import AuthPage from './pages/AuthPage'
import { AdminBookings, AdminDashboard, AdminEnquiries, AdminMembershipRequests, AdminMembers, AdminPlans, AdminSettings, AdminTrainers, BookingPage, MemberDashboard, MemberMembership, ProfilePage, WorkoutsPage } from './pages/DashboardPages'
import { useAuth } from './contexts/AuthContext'
import { Button, Loader } from './components/UI'

function PublicPage({ children }) { return <PublicLayout>{children}</PublicLayout> }

function AuthLoading() {
  return <main className="route-access"><div className="route-access-card"><Loader label="Checking your account..." /></div></main>
}

function RequireMember() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

function RequireAdmin() {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin) {
    return <main className="route-access"><div className="route-access-card">
      <span className="eyebrow"><i />RESTRICTED AREA</span>
      <h1>ADMIN ACCESS REQUIRED</h1>
      <p>This account does not have verified administrator access.</p>
      <Link to="/dashboard" className="btn btn-primary">Go to member space</Link>
    </div></main>
  }
  return <Outlet />
}

export default function App() {
  return <Routes>
    <Route path="/" element={<PublicPage><Home /></PublicPage>} />
    <Route path="/about" element={<PublicPage><About /></PublicPage>} />
    <Route path="/facilities" element={<PublicPage><Facilities /></PublicPage>} />
    <Route path="/trainers" element={<PublicPage><Trainers /></PublicPage>} />
    <Route path="/membership" element={<PublicPage><Membership /></PublicPage>} />
    <Route path="/contact" element={<PublicPage><Contact /></PublicPage>} />
    <Route path="/trial" element={<PublicPage><Trial /></PublicPage>} />
    <Route path="/login" element={<AuthPage />} />
    <Route element={<RequireMember />}>
      <Route element={<DashboardLayout />}>
      <Route path="/dashboard" element={<MemberDashboard />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/my-membership" element={<MemberMembership />} />
      <Route path="/bookings" element={<BookingPage />} />
      <Route path="/workouts" element={<WorkoutsPage />} />
      </Route>
    </Route>
    <Route element={<RequireAdmin />}>
      <Route path="/admin" element={<DashboardLayout admin />}>
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<AdminMembers />} />
        <Route path="trainers" element={<AdminTrainers />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="enquiries" element={<AdminEnquiries />} />
        <Route path="membership-requests" element={<AdminMembershipRequests />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
