import { useEffect } from 'react'
import { authApi } from '@/api/auth'
import { setAccessToken } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { initSocket } from '@/services/socket'

export function useInitAuth() {
  const { setUser,setLoading  } = useAuthStore()

  useEffect(() => {
    async function initAuth() {
      try {
        // try to get a new access token using the refresh token cookie
        const { data } = await authApi.refresh()
        setAccessToken(data.accessToken)

        // then fetch the current user
        const userResponse = await authApi.getMe()
        setUser(userResponse.data)
        initSocket(data.accessToken)
      } catch {
        // no valid refresh token — user needs to login
        setUser(null)
      } finally {
        setLoading(false)  // done checking, stop loading
      }
    }

    void initAuth()
  }, [])
}