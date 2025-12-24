import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for server-side
)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('[LOGIN] Attempt for email:', email)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Fetch user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    console.log('[LOGIN] User fetch result:', {
      found: !!user,
      error: error?.message,
      hasPasswordHash: user?.password_hash ? 'yes' : 'no',
      passwordHashLength: user?.password_hash?.length
    })

    if (error || !user) {
      console.log('[LOGIN] User not found or error:', error?.message)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.is_active) {
      console.log('[LOGIN] User is inactive')
      return NextResponse.json(
        { error: 'Account is inactive. Please contact administrator.' },
        { status: 403 }
      )
    }

    // Verify password
    console.log('[LOGIN] Verifying password...')
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    console.log('[LOGIN] Password valid:', isValidPassword)

    if (!isValidPassword) {
      console.log('[LOGIN] Password verification failed')
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    console.log('[LOGIN] Login successful for user:', user.email)

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user

    // Create session token (you can implement JWT here)
    const session = {
      user: userWithoutPassword,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }

    return NextResponse.json({
      success: true,
      session
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
