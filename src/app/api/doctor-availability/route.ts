import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { doctorAvailabilitySchema } from '@/lib/validations'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map day names to numbers (0 = Sunday, 1 = Monday, etc.)
const dayNameToNumber: { [key: string]: number } = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
}

const dayNumberToName: { [key: number]: string } = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
}

// GET all doctor availability with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctor_id')
    const dayOfWeek = searchParams.get('day_of_week')
    const isActive = searchParams.get('is_active')

    let query = supabase
      .from('doctor_availability')
      .select(`
        *,
        doctor:doctors(
          id,
          name,
          specialization,
          phone,
          email
        )
      `)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (doctorId) {
      query = query.eq('doctor_id', doctorId)
    }

    if (dayOfWeek) {
      // Convert day name to number if provided as name
      const dayNum = dayNameToNumber[dayOfWeek] !== undefined
        ? dayNameToNumber[dayOfWeek]
        : parseInt(dayOfWeek)

      if (dayNum >= 0 && dayNum <= 6) {
        query = query.eq('day_of_week', dayNum)
      }
    }

    if (isActive !== null) {
      const activeValue = isActive === 'true' || isActive === '1'
      query = query.eq('is_active', activeValue)
    }

    const { data, error } = await query

    if (error) throw error

    // Add day name to each record for convenience
    const dataWithDayNames = data?.map(record => ({
      ...record,
      day_name: dayNumberToName[record.day_of_week]
    }))

    return NextResponse.json({ success: true, data: dataWithDayNames })
  } catch (error) {
    console.error('Error fetching doctor availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch doctor availability' },
      { status: 500 }
    )
  }
}

// POST create new doctor availability
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Convert day name to number if provided as name
    if (body.day_of_week && typeof body.day_of_week === 'string') {
      if (dayNameToNumber[body.day_of_week] !== undefined) {
        body.day_of_week = dayNameToNumber[body.day_of_week]
      }
    }

    // Validate request body
    const validatedData = doctorAvailabilitySchema.parse(body)

    // Convert day name back to number for validation
    const dayNum = typeof validatedData.day_of_week === 'string'
      ? dayNameToNumber[validatedData.day_of_week]
      : dayNameToNumber[validatedData.day_of_week] || parseInt(String(validatedData.day_of_week))

    // Check if doctor exists
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, name')
      .eq('id', validatedData.doctor_id)
      .single()

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      )
    }

    // Check for overlapping schedules
    const { data: existing } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', validatedData.doctor_id)
      .eq('day_of_week', dayNum)
      .eq('is_active', true)

    if (existing && existing.length > 0) {
      // Check for time overlap
      for (const schedule of existing) {
        const existingStart = schedule.start_time
        const existingEnd = schedule.end_time
        const newStart = validatedData.start_time
        const newEnd = validatedData.end_time

        // Check if times overlap
        if (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        ) {
          return NextResponse.json(
            {
              error: 'Doctor already has a schedule that overlaps with this time',
              details: {
                existingSchedule: {
                  day: dayNumberToName[schedule.day_of_week],
                  startTime: existingStart,
                  endTime: existingEnd
                }
              }
            },
            { status: 400 }
          )
        }
      }
    }

    const { data, error } = await supabase
      .from('doctor_availability')
      .insert({
        doctor_id: validatedData.doctor_id,
        day_of_week: dayNum,
        start_time: validatedData.start_time,
        end_time: validatedData.end_time,
        slot_duration_minutes: validatedData.slot_duration_minutes,
        max_patients_per_slot: validatedData.max_patients_per_slot,
        is_active: validatedData.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        doctor:doctors(
          id,
          name,
          specialization,
          phone,
          email
        )
      `)
      .single()

    if (error) throw error

    // Add day name for convenience
    const dataWithDayName = {
      ...data,
      day_name: dayNumberToName[data.day_of_week]
    }

    return NextResponse.json({ success: true, data: dataWithDayName }, { status: 201 })
  } catch (error) {
    console.error('Error creating doctor availability:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create doctor availability' },
      { status: 500 }
    )
  }
}
