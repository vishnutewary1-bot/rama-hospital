import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { opdConsultationSchema } from '@/lib/validations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET all OPD consultations with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const patient_id = searchParams.get('patient_id')
    const doctor_id = searchParams.get('doctor_id')
    const opd_id = searchParams.get('opd_id')
    const from_date = searchParams.get('from_date')
    const to_date = searchParams.get('to_date')

    let query = supabase
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
          blood_group,
          allergies
        ),
        doctor:doctors(
          id,
          name,
          specialization,
          qualification
        ),
        opd_registration:opd_registrations(
          id,
          registration_number,
          visit_date,
          visit_type,
          token_number
        )
      `)
      .order('consultation_date', { ascending: false })

    if (search) {
      query = query.or(`chief_complaint.ilike.%${search}%,diagnosis.ilike.%${search}%,prescriptions.ilike.%${search}%`)
    }

    if (patient_id) {
      query = query.eq('patient_id', patient_id)
    }

    if (doctor_id) {
      query = query.eq('doctor_id', doctor_id)
    }

    if (opd_id) {
      query = query.eq('opd_id', opd_id)
    }

    if (from_date) {
      query = query.gte('consultation_date', from_date)
    }

    if (to_date) {
      query = query.lte('consultation_date', to_date)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching OPD consultations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OPD consultations' },
      { status: 500 }
    )
  }
}

// POST create new OPD consultation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input using Zod schema
    const validation = opdConsultationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Calculate BMI if weight and height are provided
    let bmi = null
    if (validation.data.weight && validation.data.height && validation.data.height > 0) {
      const heightInMeters = validation.data.height / 100
      bmi = validation.data.weight / (heightInMeters * heightInMeters)
      bmi = Math.round(bmi * 100) / 100 // Round to 2 decimal places
    }

    const insertData = {
      opd_id: validation.data.opd_id,
      patient_id: validation.data.patient_id,
      doctor_id: validation.data.doctor_id,
      chief_complaint: validation.data.chief_complaint,
      history_of_present_illness: validation.data.history_of_present_illness || null,
      past_medical_history: validation.data.past_medical_history || null,
      examination_findings: validation.data.examination_findings || null,
      diagnosis: validation.data.diagnosis,
      treatment_plan: validation.data.treatment_plan || null,
      prescriptions: validation.data.prescriptions || null,
      investigations_ordered: validation.data.investigations_ordered || null,
      advice: validation.data.advice || null,
      follow_up_date: validation.data.follow_up_date || null,
      follow_up_instructions: validation.data.follow_up_instructions || null,
      bp_systolic: validation.data.bp_systolic || null,
      bp_diastolic: validation.data.bp_diastolic || null,
      pulse: validation.data.pulse || null,
      temperature: validation.data.temperature || null,
      spo2: validation.data.spo2 || null,
      respiratory_rate: validation.data.respiratory_rate || null,
      weight: validation.data.weight || null,
      height: validation.data.height || null,
      consultation_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('opd_consultations')
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

    // Update OPD registration status to 'Completed'
    await supabase
      .from('opd_registrations')
      .update({
        status: 'Completed',
        consultation_ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', validation.data.opd_id)

    return NextResponse.json({
      success: true,
      data,
      message: 'Consultation created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating consultation:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create consultation'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
