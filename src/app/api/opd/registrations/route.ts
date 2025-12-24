import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { opdRegistrationSchema } from '@/lib/validations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET all OPD registrations with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const doctor_id = searchParams.get('doctor_id')
    const status = searchParams.get('status')
    const visit_date = searchParams.get('visit_date')
    const visit_type = searchParams.get('visit_type')

    let query = supabase
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
          registration_number
        ),
        doctor:doctors(
          id,
          name,
          specialization
        ),
        appointment:appointments(
          id,
          appointment_number,
          appointment_date,
          appointment_time
        )
      `)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`registration_number.ilike.%${search}%,visit_reason.ilike.%${search}%,token_number.ilike.%${search}%`)
    }

    if (doctor_id) {
      query = query.eq('doctor_id', doctor_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (visit_date) {
      query = query.eq('visit_date', visit_date)
    }

    if (visit_type) {
      query = query.eq('visit_type', visit_type)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching OPD registrations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OPD registrations' },
      { status: 500 }
    )
  }
}

// POST create new OPD registration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input using Zod schema
    const validation = opdRegistrationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Generate registration number using database function
    // The trigger will auto-generate if not provided
    const insertData = {
      patient_id: validation.data.patient_id,
      doctor_id: validation.data.doctor_id,
      appointment_id: validation.data.appointment_id || null,
      visit_date: validation.data.visit_date,
      visit_type: validation.data.visit_type,
      visit_reason: validation.data.visit_reason,
      referred_by: validation.data.referred_by || null,
      token_number: validation.data.token_number || null,
      consultation_fee: validation.data.consultation_fee,
      payment_mode: validation.data.payment_mode || null,
      payment_status: validation.data.payment_status,
      status: 'Waiting',
      checked_in_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('opd_registrations')
      .insert(insertData)
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
      message: 'OPD registration created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating OPD registration:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create OPD registration'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
