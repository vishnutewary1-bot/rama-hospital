import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { appointmentSchema } from '@/lib/validations'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET all appointments with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patient_id')
    const doctorId = searchParams.get('doctor_id')
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(
          id,
          name,
          age,
          gender,
          mobile,
          email
        ),
        doctor:doctors(
          id,
          name,
          specialization,
          consultation_fee
        )
      `)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })

    if (patientId) {
      query = query.eq('patient_id', patientId)
    }

    if (doctorId) {
      query = query.eq('doctor_id', doctorId)
    }

    if (date) {
      query = query.eq('appointment_date', date)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`appointment_number.ilike.%${search}%,reason.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
}

// POST create new appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validatedData = appointmentSchema.parse(body)

    // Check if doctor is available on the requested date
    const dayOfWeek = new Date(validatedData.appointment_date).getDay()

    const { data: availability, error: availError } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', validatedData.doctor_id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single()

    if (availError || !availability) {
      return NextResponse.json(
        { error: 'Doctor is not available on the selected day' },
        { status: 400 }
      )
    }

    // Check if doctor is on leave
    const { data: leaves } = await supabase
      .from('doctor_leaves')
      .select('*')
      .eq('doctor_id', validatedData.doctor_id)
      .eq('is_active', true)
      .lte('start_date', validatedData.appointment_date)
      .gte('end_date', validatedData.appointment_date)

    if (leaves && leaves.length > 0) {
      return NextResponse.json(
        { error: 'Doctor is on leave on the selected date' },
        { status: 400 }
      )
    }

    // Check if time slot is within doctor's availability
    const appointmentTime = validatedData.appointment_time
    const startTime = availability.start_time
    const endTime = availability.end_time

    if (appointmentTime < startTime || appointmentTime >= endTime) {
      return NextResponse.json(
        { error: 'Selected time is outside doctor\'s availability hours' },
        { status: 400 }
      )
    }

    // Check if slot is already booked
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', validatedData.doctor_id)
      .eq('appointment_date', validatedData.appointment_date)
      .eq('appointment_time', validatedData.appointment_time)
      .in('status', ['Scheduled', 'Confirmed'])

    if (existingAppointments && existingAppointments.length >= availability.max_patients_per_slot) {
      return NextResponse.json(
        { error: 'This time slot is already fully booked' },
        { status: 400 }
      )
    }

    // Create appointment
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...validatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        patient:patients(
          id,
          name,
          age,
          gender,
          mobile,
          email
        ),
        doctor:doctors(
          id,
          name,
          specialization,
          consultation_fee
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}
