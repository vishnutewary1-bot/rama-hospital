import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET all medical records with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patient_id')
    const admissionId = searchParams.get('admission_id')
    const recordType = searchParams.get('record_type')
    const doctorId = searchParams.get('doctor_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('medical_records')
      .select(`
        *,
        patient:patients(name, registration_number, age, gender),
        doctor:doctors(name, specialization)
      `)
      .order('record_date', { ascending: false })

    if (patientId) {
      query = query.eq('patient_id', patientId)
    }

    if (admissionId) {
      query = query.eq('admission_id', admissionId)
    }

    if (recordType) {
      query = query.eq('record_type', recordType)
    }

    if (doctorId) {
      query = query.eq('doctor_id', doctorId)
    }

    if (startDate) {
      query = query.gte('record_date', startDate)
    }

    if (endDate) {
      query = query.lte('record_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching medical records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medical records' },
      { status: 500 }
    )
  }
}

// POST create new medical record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('medical_records')
      .insert({
        ...body,
        record_date: body.record_date || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Error creating medical record:', error)
    return NextResponse.json(
      { error: 'Failed to create medical record' },
      { status: 500 }
    )
  }
}
