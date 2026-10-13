import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { subscribeMemberBookings } from '../services/bookings'

export function useMemberBookings() {
  const { user } = useAuth()
  const [state, setState] = useState({ bookings: [], loading: true, error: '' })

  useEffect(() => {
    let active = true
    if (!user?.uid) {
      setState({ bookings: [], loading: false, error: '' })
      return () => { active = false }
    }

    setState({ bookings: [], loading: true, error: '' })
    const unsubscribe = subscribeMemberBookings(user, bookings => {
      if (active) setState({ bookings, loading: false, error: '' })
    }, error => {
      if (import.meta.env.DEV) {
        console.error('[FitZone] Could not load member bookings', {
          uid: user.uid,
          code: error?.code ?? 'unknown',
          message: error?.message ?? String(error),
        })
      }
      if (active) setState({ bookings: [], loading: false, error: 'Bookings could not be loaded. Please try again later.' })
    })

    return () => { active = false; unsubscribe() }
  }, [user?.uid])

  return state
}
