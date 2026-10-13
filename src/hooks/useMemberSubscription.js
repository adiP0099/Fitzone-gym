import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { subscribeMemberSubscription } from '../services/memberships'

export function useMemberSubscription() {
  const { user } = useAuth()
  const [state, setState] = useState({ subscription: null, loading: true, error: '' })

  useEffect(() => {
    let active = true
    if (!user?.uid) {
      setState({ subscription: null, loading: false, error: '' })
      return () => { active = false }
    }

    setState({ subscription: null, loading: true, error: '' })
    const unsubscribe = subscribeMemberSubscription(user.uid, subscription => {
        if (active) setState({ subscription, loading: false, error: '' })
      }, error => {
        if (import.meta.env.DEV) {
          console.error('[FitZone] Could not load member subscription', {
            uid: user.uid,
            code: error?.code ?? 'unknown',
            message: error?.message ?? String(error),
          })
        }
        if (active) setState({ subscription: null, loading: false, error: 'Membership details could not be loaded. Please try again later.' })
      })

    return () => { active = false; unsubscribe() }
  }, [user?.uid])

  return state
}
