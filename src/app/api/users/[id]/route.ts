import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Validation schema for user update
const userUpdateSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  role: z.enum(['admin', 'worker', 'doctor', 'billing', 'pathology']).optional(),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits').optional().nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  is_active: z.boolean().optional(),
})

// GET single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Remove sensitive data from response
    const { password_hash, ...safeUserData } = data as any

    return NextResponse.json({ success: true, data: safeUserData })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PUT update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate input
    const validation = userUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const updateData: any = {
      ...validation.data,
      updated_at: new Date().toISOString(),
    }

    // If password is being updated, hash it
    if (validation.data.password) {
      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(validation.data.password, saltRounds)
      updateData.password_hash = hashedPassword
      delete updateData.password

      // Also update password in Supabase Auth
      await supabase.auth.admin.updateUserById(id, {
        password: validation.data.password,
      })
    }

    // If email is being updated, update it in Supabase Auth as well
    if (validation.data.email) {
      await supabase.auth.admin.updateUserById(id, {
        email: validation.data.email,
      })
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Remove sensitive data from response
    const { password_hash, ...safeUserData } = data as any

    return NextResponse.json({
      success: true,
      data: safeUserData,
      message: 'User updated successfully'
    })
  } catch (error) {
    console.error('Error updating user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// DELETE user (soft delete - set is_active to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Soft delete: set is_active to false instead of deleting
    const { data, error } = await supabase
      .from('users')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Optionally, you can also disable the user in Supabase Auth
    await supabase.auth.admin.updateUserById(id, {
      user_metadata: { is_active: false },
    })

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully'
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
