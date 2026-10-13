import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { subscribeMemberMembershipRequests } from '../services/membershipRequests'

export function useMemberMembershipRequests() {
  const { user } = useAuth()
  const [state, setState] = useState({ requests: [], loading: true, error: '' })

  useEffect(() => {
    let active = true
    if (!user?.uid) {
      setState({ requests: [], loading: false, error: '' })
      return () => { active = false }
    }

    setState({ requests: [], loading: true, error: '' })
    const unsubscribe = subscribeMemberMembershipRequests(user, requests => {
      if (active) setState({ requests, loading: false, error: '' })
    }, error => {
      if (import.meta.env.DEV) {
        console.error('[FitZone] Could not load the member membership requests', {
          uid: user.uid,
          code: error?.code ?? 'unknown',
          message: error?.message ?? String(error),
        })
      }
      if (active) setState({ requests: [], loading: false, error: 'Membership requests could not be loaded. Please try again later.' })
    })

    return () => { active = false; unsubscribe() }
  }, [user?.uid])

  return state
}
