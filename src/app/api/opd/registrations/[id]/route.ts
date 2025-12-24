import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { opdRegistrationBaseSchema } from '@/lib/validations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET single OPD registration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('opd_registrations')
      .select(`
        *,
        patient:patients(
          id,
          name,
          age,
          age_unit,
          gender,
          mobile,
          registration_number,
          address,
          blood_group,
          allergies,
          medical_alerts
        ),
        doctor:doctors(
          id,
          name,
          specialization,
          qualification,
          consultation_fee,
          follow_up_fee
        ),
        appointment:appointments(
          id,
          appointment_number,
          appointment_date,
          appointment_time,
          appointment_type
        ),
        consultations:opd_consultations(
          id,
          consultation_date,
          chief_complaint,
          diagnosis,
          prescriptions,
          follow_up_date
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'OPD registration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching OPD registration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OPD registration' },
      { status: 500 }
    )
  }
}

// PATCH update OPD registration (partial update)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // For PATCH, we allow partial updates, so we make all fields optional
    const partialSchema = opdRegistrationBaseSchema.partial()
    const validation = partialSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const updateData = {
      ...validation.data,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('opd_registrations')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        patient:patients(
          id,
          name,
          age,
          age_unit,
          gender,
          mobile,
          registration_number
        ),
        doctor:doctors(
          id,
          name,
          specialization
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      message: 'OPD registration updated successfully'
    })
  } catch (error) {
    console.error('Error updating OPD registration:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update OPD registration'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// DELETE OPD registration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await supabase
      .from('opd_registrations')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'OPD registration deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting OPD registration:', error)
    return NextResponse.json(
      { error: 'Failed to delete OPD registration' },
      { status: 500 }
    )
  }
}
