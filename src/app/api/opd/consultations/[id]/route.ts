import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { opdConsultationBaseSchema } from '@/lib/validations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET single consultation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('opd_consultations')
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
          medical_alerts,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relation
        ),
        doctor:doctors(
          id,
          name,
          specialization,
          qualification,
          phone,
          email
        ),
        opd_registration:opd_registrations(
          id,
          registration_number,
          visit_date,
          visit_type,
          visit_reason,
          token_number,
          consultation_fee,
          payment_status
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching consultation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch consultation' },
      { status: 500 }
    )
  }
}

// PATCH update consultation (partial update)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // For PATCH, we allow partial updates, so we make all fields optional
    const partialSchema = opdConsultationBaseSchema.partial()
    const validation = partialSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Calculate BMI if weight and height are provided
    let updateData: any = {
      ...validation.data,
      updated_at: new Date().toISOString()
    }

    // Note: BMI is auto-calculated by the database using GENERATED ALWAYS AS
    // so we don't need to calculate it here

    const { data, error } = await supabase
      .from('opd_consultations')
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
        ),
        opd_registration:opd_registrations(
          id,
          registration_number,
          visit_date,
          visit_type
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      message: 'Consultation updated successfully'
    })
  } catch (error) {
    console.error('Error updating consultation:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update consultation'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
