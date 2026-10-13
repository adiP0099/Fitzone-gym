import { useEffect, useState } from 'react'
import { getIdTokenResult } from 'firebase/auth'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AuthForm } from '../components/Forms'
import { Eyebrow } from '../components/UI'
import fitzoneMark from '../assets/fitzone-mark.svg'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading, isAdmin } = useAuth()
  const [adminLogin, setAdminLogin] = useState(() => location.state?.from?.pathname?.startsWith('/admin') ?? false)
  const [adminError, setAdminError] = useState('')
  const [resolvePendingAdminClick, setResolvePendingAdminClick] = useState(false)
  const [adminChecking, setAdminChecking] = useState(false)
  const mode = params.get('mode') === 'register' ? 'register' : 'login'
  const register = mode === 'register'
  const invalidMode = params.has('mode') && !['login', 'register'].includes(params.get('mode'))
  const requestedPath = location.state?.from?.pathname
  useEffect(() => {
    if (requestedPath?.startsWith('/admin')) {
      setAdminLogin(true)
      setAdminError('')
    }
  }, [requestedPath])
  useEffect(() => {
    if (!resolvePendingAdminClick || loading) return
    setResolvePendingAdminClick(false)
    if (!user) return
    if (isAdmin) navigate('/admin', { replace: true })
    else setAdminError('This account does not have verified administrator access.')
  }, [isAdmin, loading, navigate, resolvePendingAdminClick, user])
  if (invalidMode) return <Navigate to="/login" replace />
  function changeMode(next) {
    if (next === 'register') setAdminLogin(false)
    setAdminError('')
    setParams(next === 'register' ? { mode: next } : {}, { replace: true })
  }
  async function startAdminLogin() {
    setAdminError('')
    if (loading) {
      setAdminLogin(true)
      setResolvePendingAdminClick(true)
      if (register) setParams({}, { replace: true })
      return
    }
    if (user) {
      setAdminChecking(true)
      try {
        const token = await getIdTokenResult(user, true)
        if (token.claims.admin === true) navigate('/admin', { replace: true })
        else setAdminError('This account does not have verified administrator access.')
      } catch {
        setAdminError('We could not verify administrator access. Please try again.')
      } finally {
        setAdminChecking(false)
      }
      return
    }
    setAdminLogin(true)
    if (register) setParams({}, { replace: true })
  }
  return <main className="auth-page"><section className="auth-image"><div className="auth-image-overlay" /><Link to="/" className="auth-back"><ArrowLeft size={16} /> Back to FitZone</Link><div className="auth-image-copy"><Eyebrow>YOUR TRAINING SPACE</Eyebrow><h1>SHOW UP<br />FOR <em>YOU.</em></h1><p>Every great routine begins with a first step.</p></div><span className="auth-photo-credit">TRAIN WITH PURPOSE / FITZONE</span></section><section className="auth-panel"><div className="auth-panel-inner"><div className="auth-brand"><img className="brand-mark" src={fitzoneMark} alt="" /><span>FIT<span>ZONE</span></span></div><Eyebrow>WELCOME TO YOUR FITZONE</Eyebrow><h2>{register ? 'CREATE YOUR ACCOUNT' : adminLogin ? 'ADMINISTRATOR SIGN IN' : 'GOOD TO SEE YOU'}</h2><p>{register ? 'Set up your member profile to get started.' : adminLogin ? 'Sign in with your FitZone administrator account.' : 'Sign in to pick up where you left off.'}</p><div className="auth-tabs" role="tablist"><button role="tab" aria-selected={!register} className={!register ? 'selected' : ''} onClick={() => changeMode('login')}>Log in</button><button role="tab" aria-selected={register} className={register ? 'selected' : ''} onClick={() => changeMode('register')}>Create account</button></div><AuthForm key={mode} mode={mode} redirectTo={location.state?.from?.pathname} adminLogin={adminLogin} /><div className="auth-admin-note">Staff? Admin tools are available in preview mode at <Link to="/admin">Admin dashboard</Link>. <button type="button" className="auth-admin-login" onClick={startAdminLogin} disabled={adminChecking || loading}>{adminChecking ? 'Checking access…' : 'Admin Login'}</button></div>{adminError && <p className="form-error" role="alert">{adminError}</p>}</div></section></main>
}
