// Standalone Authentication Service
// This provides authentication without requiring Supabase setup

import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  password_hash?: string
  full_name: string
  role: 'admin' | 'worker' | 'doctor' | 'billing'
  phone?: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

// Default admin user (hardcoded for immediate access)
const DEFAULT_ADMIN: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@ramahospital.com',
  password_hash: '$2a$10$MGEWbWsAjJTVXbgC5MNceOV2vfEryMmi89hYt1nlVMCv1gSBkmE3C', // Admin@123
  full_name: 'System Administrator',
  role: 'admin',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

// Additional default users for testing
const DEFAULT_USERS: User[] = [
  DEFAULT_ADMIN,
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'doctor@ramahospital.com',
    password_hash: '$2a$10$MGEWbWsAjJTVXbgC5MNceOV2vfEryMmi89hYt1nlVMCv1gSBkmE3C', // Admin@123
    full_name: 'Dr. John Smith',
    role: 'doctor',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'worker@ramahospital.com',
    password_hash: '$2a$10$MGEWbWsAjJTVXbgC5MNceOV2vfEryMmi89hYt1nlVMCv1gSBkmE3C', // Admin@123
    full_name: 'Staff Member',
    role: 'worker',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

class AuthService {
  private supabase: any
  private useLocalAuth: boolean = false

  constructor() {
    // Try to initialize Supabase
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        this.supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        console.log('[AUTH] Supabase client initialized')
      } else {
        console.log('[AUTH] No Supabase credentials, using local auth')
        this.useLocalAuth = true
      }
    } catch (error) {
      console.log('[AUTH] Supabase initialization failed, using local auth')
      this.useLocalAuth = true
    }
  }

  async authenticate(email: string, password: string): Promise<{ user: User } | { error: string }> {
    console.log('[AUTH] Authenticating user:', email)

    // Try Supabase first
    if (!this.useLocalAuth && this.supabase) {
      try {
        const result = await this.authenticateWithSupabase(email, password)
        if ('user' in result) {
          console.log('[AUTH] Supabase authentication successful')
          return result
        }
        console.log('[AUTH] Supabase authentication failed, trying local auth')
      } catch (error) {
        console.log('[AUTH] Supabase error, falling back to local auth:', error)
      }
    }

    // Fallback to local authentication
    return this.authenticateLocally(email, password)
  }

  private async authenticateWithSupabase(email: string, password: string): Promise<{ user: User } | { error: string }> {
    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error || !user) {
        return { error: 'User not found in database' }
      }

      if (!user.is_active) {
        return { error: 'Account is inactive' }
      }

      if (!user.password_hash) {
        return { error: 'No password set for user' }
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash)

      if (!isValidPassword) {
        return { error: 'Invalid password' }
      }

      // Update last login
      await this.supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)

      return { user }
    } catch (error: any) {
      console.error('[AUTH] Supabase error:', error)
      return { error: error.message || 'Database error' }
    }
  }

  private async authenticateLocally(email: string, password: string): Promise<{ user: User } | { error: string }> {
    console.log('[AUTH] Using local authentication')

    // Find user in default users
    const user = DEFAULT_USERS.find(u => u.email.toLowerCase() === email.toLowerCase())

    if (!user) {
      console.log('[AUTH] User not found:', email)
      return { error: 'Invalid credentials' }
    }

    if (!user.is_active) {
      console.log('[AUTH] User is inactive')
      return { error: 'Account is inactive' }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash!)

    console.log('[AUTH] Password validation:', isValidPassword)

    if (!isValidPassword) {
      return { error: 'Invalid credentials' }
    }

    // Update last login
    user.last_login = new Date().toISOString()

    console.log('[AUTH] Local authentication successful for:', user.email)

    return { user }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    // Try Supabase first
    if (!this.useLocalAuth && this.supabase) {
      try {
        const { data: user } = await this.supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single()

        if (user) return user
      } catch (error) {
        console.log('[AUTH] Supabase getUserByEmail failed, trying local')
      }
    }

    // Fallback to local
    return DEFAULT_USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
  }

  async getUserById(id: string): Promise<User | null> {
    // Try Supabase first
    if (!this.useLocalAuth && this.supabase) {
      try {
        const { data: user } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single()

        if (user) return user
      } catch (error) {
        console.log('[AUTH] Supabase getUserById failed, trying local')
      }
    }

    // Fallback to local
    return DEFAULT_USERS.find(u => u.id === id) || null
  }

  getDefaultUsers(): User[] {
    return DEFAULT_USERS.map(u => {
      const { password_hash, ...userWithoutPassword } = u
      return userWithoutPassword as User
    })
  }
}

// Export singleton instance
export const authService = new AuthService()

// Export default users info for documentation
export const DEFAULT_CREDENTIALS = {
  admin: {
    email: 'admin@ramahospital.com',
    password: 'Admin@123',
    role: 'admin'
  },
  doctor: {
    email: 'doctor@ramahospital.com',
    password: 'Admin@123',
    role: 'doctor'
  },
  worker: {
    email: 'worker@ramahospital.com',
    password: 'Admin@123',
    role: 'worker'
  }
}
