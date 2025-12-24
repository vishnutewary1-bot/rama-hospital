'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from '@/types/database'
import { userService } from './database'
import * as bcrypt from 'bcryptjs'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SESSION_KEY = 'auth_session'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSession = useCallback(async () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        if (session.userId && session.expiresAt > Date.now()) {
          // Get fresh user data
          const userData = await userService.getById(session.userId)
          if (userData && userData.is_active) {
            setUser(userData)
          } else {
            // Clear invalid session
            localStorage.removeItem(SESSION_KEY)
          }
        } else {
          // Clear expired session
          localStorage.removeItem(SESSION_KEY)
        }
      }
    } catch (error) {
      console.error('Error loading session:', error)
      localStorage.removeItem(SESSION_KEY)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  async function signIn(email: string, password: string): Promise<{ error: Error | null }> {
    try {
      // Get user by email
      const userData = await userService.getByEmail(email)

      if (!userData) {
        return { error: new Error('Invalid email or password') }
      }

      if (!userData.is_active) {
        return { error: new Error('Account is inactive') }
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, (userData as any).password)

      if (!passwordMatch) {
        return { error: new Error('Invalid email or password') }
      }

      // Create session (expires in 30 days)
      const session = {
        userId: userData.id,
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      setUser(userData)

      return { error: null }
    } catch (error) {
      console.error('Login error:', error)
      return { error: error instanceof Error ? error : new Error('Login failed') }
    }
  }

  async function signOut(): Promise<void> {
    try {
      localStorage.removeItem(SESSION_KEY)
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  async function refreshUser(): Promise<void> {
    await loadSession()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper hook to check user role
export function useHasRole(roles: string | string[]): boolean {
  const { user } = useAuth()
  if (!user) return false

  const roleArray = Array.isArray(roles) ? roles : [roles]
  return roleArray.includes(user.role)
}

// Helper hook to check if user is admin
export function useIsAdmin(): boolean {
  return useHasRole('admin')
}
