import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { doctorSchema } from '@/lib/validations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET single doctor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching doctor:', error)
    return NextResponse.json(
      { error: 'Failed to fetch doctor' },
      { status: 500 }
    )
  }
}

// PUT update doctor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate input using Zod schema
    const validation = doctorSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const updateData = {
      name: validation.data.name,
      specialization: validation.data.specialization,
      qualification: validation.data.qualification || null,
      phone: validation.data.phone || null,
      email: validation.data.email || null,
      consultation_fee: validation.data.consultation_fee,
      follow_up_fee: validation.data.follow_up_fee,
      is_visiting: validation.data.is_visiting,
      visit_days: validation.data.visit_days || null,
      visit_timings: validation.data.visit_timings || null,
      opd_days: validation.data.opd_days || null,
      opd_timings: validation.data.opd_timings || null,
      bank_name: validation.data.bank_name || null,
      bank_account_number: validation.data.bank_account_number || null,
      bank_ifsc: validation.data.bank_ifsc || null,
      commission_percentage: validation.data.commission_percentage || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('doctors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      message: 'Doctor updated successfully'
    })
  } catch (error) {
    console.error('Error updating doctor:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update doctor'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// DELETE doctor (soft delete - set is_active to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Soft delete: set is_active to false instead of deleting
    const { data, error } = await supabase
      .from('doctors')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Doctor deactivated successfully'
    })
  } catch (error) {
    console.error('Error deleting doctor:', error)
    return NextResponse.json(
      { error: 'Failed to delete doctor' },
      { status: 500 }
    )
  }
}
