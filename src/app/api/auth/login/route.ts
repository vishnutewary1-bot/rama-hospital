import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'

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

    // Authenticate using the auth service (tries Supabase first, falls back to local)
    const result = await authService.authenticate(email, password)

    if ('error' in result) {
      console.log('[LOGIN] Authentication failed:', result.error)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const { user } = result
    console.log('[LOGIN] Login successful for user:', user.email)

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user

    // Create session token
    const session = {
      user: userWithoutPassword,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }

    console.log('[LOGIN] Session created successfully')

    return NextResponse.json({
      success: true,
      session
    })

  } catch (error) {
    console.error('[LOGIN] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
