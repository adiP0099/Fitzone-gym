import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getIdTokenResult, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../services/firebase'
import { getAuthErrorMessage, signOutCurrentUser } from '../services/auth'
import { ensureMemberProfile } from '../services/profiles'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: Boolean(auth), isAdmin: false, error: '', profile: null, profileLoading: Boolean(auth), profileError: '' })

  useEffect(() => {
    if (!auth) {
      setState({ user: null, loading: false, isAdmin: false, error: '', profile: null, profileLoading: false, profileError: '' })
      return undefined
    }

    let active = true
    let currentUid = null
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!active) return
      currentUid = user?.uid ?? null
      setState({ user, loading: Boolean(user), isAdmin: false, error: '', profile: null, profileLoading: Boolean(user), profileError: '' })
      if (!user) {
        setState({ user: null, loading: false, isAdmin: false, error: '', profile: null, profileLoading: false, profileError: '' })
        return
      }

      let isAdmin = false
      let errorMessage = ''
      let profile = null
      let profileError = ''
      try {
        // Resolve authorization from a freshly issued Firebase ID token. This
        // picks up newly assigned or revoked custom claims before routes render.
        const token = await getIdTokenResult(user, true)
        isAdmin = token.claims.admin === true
      } catch (error) {
        errorMessage = getAuthErrorMessage(error)
      }
      try {
        profile = await ensureMemberProfile(user)
      } catch (error) {
        profileError = getAuthErrorMessage({ code: 'firestore/profile-load-failed', cause: error })
        if (import.meta.env.DEV) {
          console.error('[FitZone] Could not load or initialize the signed-in member profile', {
            uid: user.uid,
            code: error?.code ?? 'unknown',
            message: error?.message ?? String(error),
          })
        }
      }
      if (active && currentUid === user.uid) {
        setState({ user, loading: false, isAdmin, error: errorMessage, profile, profileLoading: false, profileError })
      }
    }, error => {
      currentUid = null
      if (active) setState({ user: null, loading: false, isAdmin: false, error: getAuthErrorMessage(error), profile: null, profileLoading: false, profileError: '' })
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    ...state,
    role: state.user ? (state.isAdmin ? 'admin' : 'member') : null,
    signOut: signOutCurrentUser,
    updateCurrentProfile: (uid, profileUpdates) => setState(current => {
      if (!current.user || current.user.uid !== uid || !current.profile) return current
      return { ...current, profile: { ...current.profile, ...profileUpdates } }
    }),
  }), [state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
