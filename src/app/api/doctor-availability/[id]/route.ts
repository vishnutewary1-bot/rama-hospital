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

// GET single doctor availability
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('doctor_availability')
      .select(`
        *,
        doctor:doctors(
          id,
          name,
          specialization,
          phone,
          email,
          consultation_fee,
          follow_up_fee
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Doctor availability not found' },
        { status: 404 }
      )
    }

    // Add day name for convenience
    const dataWithDayName = {
      ...data,
      day_name: dayNumberToName[data.day_of_week]
    }

    return NextResponse.json({ success: true, data: dataWithDayName })
  } catch (error) {
    console.error('Error fetching doctor availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch doctor availability' },
      { status: 500 }
    )
  }
}

// PATCH update doctor availability
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Convert day name to number if provided as name
    if (body.day_of_week && typeof body.day_of_week === 'string') {
      if (dayNameToNumber[body.day_of_week] !== undefined) {
        body.day_of_week = dayNameToNumber[body.day_of_week]
      }
    }

    // Create a partial schema for updates (all fields optional)
    const { doctorAvailabilityBaseSchema } = await import('@/lib/validations')
    const updateSchema = doctorAvailabilityBaseSchema.partial()
    const validatedData = updateSchema.parse(body)

    // Get current availability data
    const { data: currentAvailability } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('id', id)
      .single()

    if (!currentAvailability) {
      return NextResponse.json(
        { error: 'Doctor availability not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const dayNum = validatedData.day_of_week
      ? (typeof validatedData.day_of_week === 'string'
        ? dayNameToNumber[validatedData.day_of_week]
        : validatedData.day_of_week)
      : currentAvailability.day_of_week

    const doctorId = validatedData.doctor_id || currentAvailability.doctor_id
    const startTime = validatedData.start_time || currentAvailability.start_time
    const endTime = validatedData.end_time || currentAvailability.end_time

    // Check for overlapping schedules with other availability records
    const { data: existing } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayNum)
      .eq('is_active', true)
      .neq('id', id)

    if (existing && existing.length > 0) {
      // Check for time overlap
      for (const schedule of existing) {
        const existingStart = schedule.start_time
        const existingEnd = schedule.end_time

        // Check if times overlap
        if (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        ) {
          return NextResponse.json(
            {
              error: 'This schedule overlaps with another existing schedule',
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

    // Prepare update object
    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString()
    }

    // If day_of_week was updated, use the numeric value
    if (validatedData.day_of_week !== undefined) {
      updateData.day_of_week = dayNum
    }

    const { data, error } = await supabase
      .from('doctor_availability')
      .update(updateData)
      .eq('id', id)
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

    return NextResponse.json({ success: true, data: dataWithDayName })
  } catch (error) {
    console.error('Error updating doctor availability:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update doctor availability' },
      { status: 500 }
    )
  }
}

// DELETE doctor availability
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if availability exists
    const { data: availability } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('id', id)
      .single()

    if (!availability) {
      return NextResponse.json(
        { error: 'Doctor availability not found' },
        { status: 404 }
      )
    }

    // Check if there are future appointments using this availability
    // Get all future dates for this day of week
    const dayNum = availability.day_of_week
    const today = new Date()
    const futureAppointmentsCheck = []

    // Check next 90 days for appointments
    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)
      if (checkDate.getDay() === dayNum) {
        futureAppointmentsCheck.push(checkDate.toISOString().split('T')[0])
      }
    }

    if (futureAppointmentsCheck.length > 0) {
      const { data: futureAppointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', availability.doctor_id)
        .in('appointment_date', futureAppointmentsCheck)
        .in('status', ['Scheduled', 'Confirmed'])

      if (futureAppointments && futureAppointments.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete availability with future appointments',
            details: {
              futureAppointmentsCount: futureAppointments.length,
              message: 'Please cancel or reschedule existing appointments first, or deactivate this availability instead of deleting it'
            }
          },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase
      .from('doctor_availability')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Doctor availability deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting doctor availability:', error)
    return NextResponse.json(
      { error: 'Failed to delete doctor availability' },
      { status: 500 }
    )
  }
}
