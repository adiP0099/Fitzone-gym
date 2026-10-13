import { useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { Activity, CalendarDays, Dumbbell, LayoutDashboard, Menu, Settings, Users, X, UserRound, CreditCard, ClipboardList, MessageSquare, UserCog, ChevronLeft } from 'lucide-react'
import fitzoneMark from '../assets/fitzone-mark.svg'
import { useAuth } from '../contexts/AuthContext'
import { getUserDisplayName, getUserInitials } from '../services/auth'

const memberLinks = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { label: 'My profile', path: '/profile', icon: UserRound },
  { label: 'Membership', path: '/my-membership', icon: CreditCard },
  { label: 'Bookings', path: '/bookings', icon: CalendarDays },
  { label: 'Workouts', path: '/workouts', icon: Dumbbell },
]
const adminLinks = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard },
  { label: 'Members', path: '/admin/members', icon: Users },
  { label: 'Trainers', path: '/admin/trainers', icon: UserCog },
  { label: 'Membership plans', path: '/admin/plans', icon: CreditCard },
  { label: 'Bookings', path: '/admin/bookings', icon: CalendarDays },
  { label: 'Enquiries', path: '/admin/enquiries', icon: MessageSquare },
  { label: 'Membership requests', path: '/admin/membership-requests', icon: ClipboardList },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
]

export default function DashboardLayout({ admin = false }) {
  const [open, setOpen] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const displayName = getUserDisplayName(user)
  const links = admin ? adminLinks : memberLinks
  async function handleSignOut() {
    setSignOutError('')
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch {
      setSignOutError('Could not sign out. Please try again.')
    }
  }
  return <div className="dashboard-shell">
    <aside className={`dashboard-sidebar ${open ? 'sidebar-open' : ''}`}>
      <Link to="/" className="brand dashboard-brand"><img className="brand-mark" src={fitzoneMark} alt="" /><span>FIT<span>ZONE</span></span></Link>
      <div className="side-caption">{admin ? 'ADMINISTRATION' : 'MEMBER SPACE'}</div>
      <nav aria-label={admin ? 'Admin navigation' : 'Member navigation'}>{links.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === '/admin' || path === '/dashboard'} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'side-link active' : 'side-link'}><Icon size={18} />{label}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><span className="help-icon"><Activity size={17} /></span><b>Need a hand?</b><p>Our team is here to keep you moving.</p><Link to="/contact">Contact FitZone <ChevronLeft size={13} className="arrow-right" /></Link></div><Link to="/" className="back-site">← Back to website</Link></div>
    </aside>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <div className="dashboard-content"><header className="dashboard-topbar"><button className="dash-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation"><Menu /></button><div><span>{admin ? 'FitZone / Admin' : 'FitZone / Member space'}</span><h1>{admin ? 'Studio overview' : 'Your training space'}</h1></div><button type="button" className="dash-signout" onClick={handleSignOut}>Sign out</button><Link to="/profile" className="avatar" aria-label={`Open profile for ${displayName}`}>{getUserInitials(user)}</Link></header>{signOutError && <p className="dash-auth-error" role="alert">{signOutError}</p>}<main className="dashboard-main"><Outlet /></main><footer className="dash-footer">{admin ? 'FitZone administration' : 'FitZone member experience'}</footer></div>
  </div>
}
