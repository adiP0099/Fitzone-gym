import { useRef, useState } from 'react'
import { getIdTokenResult } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Info } from 'lucide-react'
import { validateEmail } from '../utils/form'
import { getAuthErrorMessage, logAuthError, registerWithEmail, sendPasswordReset, signInWithEmail } from '../services/auth'
import { firebaseReady } from '../services/firebase'
import { getTrialRequestErrorMessage, saveTrialRequest } from '../services/trials'
import { Button } from './UI'

export function DemoForm({ kind = 'contact' }) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const trial = kind === 'trial'
  async function submit(e) {
    e.preventDefault()
    if (state === 'sending' || state === 'done') return
    const form = e.currentTarget
    if (!form.reportValidity()) return
    const fullName = form.elements.name.value.trim()
    const email = form.elements.email.value.trim()
    if (!validateEmail(email)) { setError('Enter a valid email address.'); return }
    if (trial) {
      const phone = form.elements.phone.value.trim()
      const preferredVisit = form.elements.visit.value
      const goals = form.elements.message.value.trim()
      if (fullName.length < 2 || fullName.length > 100) { setError('Enter a name between 2 and 100 characters.'); return }
      if (email.length > 254) { setError('Enter an email address under 255 characters.'); return }
      if (!/^\+?[0-9(). -]{7,25}$/.test(phone) || phone.replace(/\D/g, '').length < 7) { setError('Enter a valid phone number.'); return }
      if (!['Weekday morning', 'Weekday evening', 'Weekend'].includes(preferredVisit)) { setError('Choose a preferred visit time.'); return }
      if (!goals || goals.length > 2000) { setError('Enter your goals in 1 to 2,000 characters.'); return }
      setError('')
      setState('sending')
      try {
        await saveTrialRequest({ fullName, email, phone, preferredVisit, goals })
        setState('done')
      } catch (requestError) {
        if (import.meta.env.DEV) {
          console.error('[FitZone] Firestore operation failed', {
            operation: 'trialRequests.create',
            code: requestError?.code ?? 'unknown',
            message: requestError?.message ?? String(requestError),
          })
        }
        setError(getTrialRequestErrorMessage(requestError))
        setState('idle')
      }
      return
    }
    setError('')
    setState('done')
  }
  return <form className="form-stack" onSubmit={submit}>
    <div className="form-row">
      <label>Full name<input name="name" required maxLength={trial ? 100 : undefined} placeholder="Your name" /></label>
      <label>Email address<input name="email" type="email" required maxLength={trial ? 254 : undefined} placeholder="you@example.com" /></label>
    </div>
    {trial && <div className="form-row">
      <label>Phone number<input name="phone" type="tel" required maxLength={25} placeholder="+1 (555) 000-0000" /></label>
      <label>Preferred visit<select name="visit" defaultValue="" required><option value="" disabled>Select a time</option><option>Weekday morning</option><option>Weekday evening</option><option>Weekend</option></select></label>
    </div>}
    {!trial && <label>What can we help with?<select name="topic" defaultValue="General enquiry"><option>General enquiry</option><option>Membership plans</option><option>Personal training</option><option>Group classes</option></select></label>}
    <label>{trial ? 'Your goals' : 'Message'}<textarea name="message" rows="4" required maxLength={trial ? 2000 : undefined} placeholder={trial ? 'Tell us what you would like to work toward...' : 'Write your message...'} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <Button type="submit" disabled={state === 'sending' || state === 'done'}>{state === 'sending' ? 'Saving request...' : state === 'done' ? trial ? 'Request saved' : 'Demo request noted' : trial ? 'Request my free trial' : 'Send message'}</Button>
    {state === 'done' && <p className="form-note" role="status"><Info size={16} /> {trial ? 'Your request was saved. This does not reserve a visit; the FitZone team can follow up to confirm a time.' : 'Demo only — this request was not sent or saved.'}</p>}
  </form>
}

export function AuthForm({ mode, redirectTo, adminLogin = false }) {
  const registering = mode === 'register'
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const emailRef = useRef(null)

  async function submit(e) {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.reportValidity()) return
    const email = form.elements.email.value.trim()
    const password = form.elements.password.value
    if (!validateEmail(email)) { setError('Enter a valid email address.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (registering && password !== form.elements.confirmPassword.value) { setError('Passwords do not match.'); return }

    setError('')
    setStatus('')
    setLoading(true)
    try {
      if (registering) {
        await registerWithEmail(email, password, form.elements.name.value)
        navigate('/dashboard', { replace: true })
      } else {
        const user = await signInWithEmail(email, password)
        let destination
        if (adminLogin) {
          const token = await getIdTokenResult(user, true)
          if (token.claims.admin !== true) {
            setError('This account does not have verified administrator access.')
            return
          }
          destination = '/admin'
        } else {
          destination = redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
            ? redirectTo
            : '/dashboard'
        }
        navigate(destination, { replace: true })
      }
    } catch (authError) {
      logAuthError(authError, registering ? 'registration' : 'sign-in')
      setError(getAuthErrorMessage(authError))
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword() {
    const email = emailRef.current?.value.trim() ?? ''
    if (!validateEmail(email)) {
      setError('Enter a valid email address above to reset your password.')
      setStatus('')
      return
    }
    setError('')
    setStatus('')
    setLoading(true)
    try {
      await sendPasswordReset(email)
      setStatus('If an account exists for this address, a password reset email has been requested.')
    } catch (authError) {
      logAuthError(authError, 'password-reset')
      setError(getAuthErrorMessage(authError))
    } finally {
      setLoading(false)
    }
  }
  return <form className="form-stack auth-form" onSubmit={submit} noValidate>
    {registering && <label>Full name<input name="name" autoComplete="name" required placeholder="Your name" /></label>}
    <label>Email address<input ref={emailRef} name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
    <label>Password<div className="password-wrap"><input name="password" aria-label="Password" type={show ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} required minLength="8" placeholder="At least 8 characters" /><button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
    {registering && <label>Confirm password<input name="confirmPassword" type={show ? 'text' : 'password'} autoComplete="new-password" required placeholder="Enter password again" /></label>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {status && <p className="form-note" role="status">{status}</p>}
    <Button type="submit" disabled={loading}>{loading ? 'Please wait...' : registering ? 'Create account' : adminLogin ? 'Sign in as administrator' : 'Sign in'}</Button>
    {!registering && <button className="auth-reset-button" type="button" onClick={resetPassword} disabled={loading}>Forgot password?</button>}
    <p className="form-note"><Info size={16} /> {firebaseReady ? 'Sign-in uses Firebase Authentication. Dashboard business data remains mock content.' : 'Firebase Authentication needs valid local VITE_FIREBASE_* configuration.'}</p>
  </form>
}
