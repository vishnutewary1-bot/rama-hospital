import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TimeSlot {
  time: string
  isAvailable: boolean
  bookedCount: number
  maxPatients: number
}

// Helper function to add minutes to a time string
function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number)
  const totalMinutes = hours * 60 + mins + minutes
  const newHours = Math.floor(totalMinutes / 60) % 24
  const newMins = totalMinutes % 60
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
}

// Helper function to compare time strings
function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number)
  return hours * 60 + mins
}

// GET available slots for a doctor on a specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctor_id')
    const date = searchParams.get('date')

    if (!doctorId) {
      return NextResponse.json(
        { error: 'doctor_id parameter is required' },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: 'date parameter is required' },
        { status: 400 }
      )
    }

    // Validate date format
    const requestedDate = new Date(date)
    if (isNaN(requestedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Check if date is in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (requestedDate < today) {
      return NextResponse.json(
        { error: 'Cannot get slots for past dates' },
        { status: 400 }
      )
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = requestedDate.getDay()

    // Check if doctor is on leave on this date
    const { data: leaves } = await supabase
      .from('doctor_leaves')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_active', true)
      .lte('start_date', date)
      .gte('end_date', date)

    if (leaves && leaves.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          doctorId,
          isOnLeave: true,
          leaveReason: leaves[0].reason,
          slots: []
        }
      })
    }

    // Get doctor's availability for this day of week
    const { data: availability, error: availError } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)

    if (availError) throw availError

    if (!availability || availability.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          doctorId,
          isAvailable: false,
          message: 'Doctor is not available on this day of the week',
          slots: []
        }
      })
    }

    // Get existing appointments for this doctor on this date
    const { data: existingAppointments, error: apptError } = await supabase
      .from('appointments')
      .select('appointment_time, status')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['Scheduled', 'Confirmed'])

    if (apptError) throw apptError

    // Generate time slots
    const slots: TimeSlot[] = []

    for (const schedule of availability) {
      const startTime = schedule.start_time
      const endTime = schedule.end_time
      const slotDuration = schedule.slot_duration_minutes
      const maxPatients = schedule.max_patients_per_slot

      let currentTime = startTime

      while (timeToMinutes(currentTime) < timeToMinutes(endTime)) {
        // Count how many appointments exist for this slot
        const bookedCount = existingAppointments?.filter(
          appt => appt.appointment_time === currentTime
        ).length || 0

        const isAvailable = bookedCount < maxPatients

        // For today's date, skip slots that have already passed
        if (date === today.toISOString().split('T')[0]) {
          const now = new Date()
          const currentHours = now.getHours()
          const currentMinutes = now.getMinutes()
          const currentTotalMinutes = currentHours * 60 + currentMinutes

          if (timeToMinutes(currentTime) <= currentTotalMinutes) {
            currentTime = addMinutes(currentTime, slotDuration)
            continue
          }
        }

        slots.push({
          time: currentTime,
          isAvailable,
          bookedCount,
          maxPatients
        })

        currentTime = addMinutes(currentTime, slotDuration)
      }
    }

    // Get doctor details
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id, name, specialization, consultation_fee')
      .eq('id', doctorId)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        date,
        doctorId,
        doctor,
        isAvailable: true,
        isOnLeave: false,
        totalSlots: slots.length,
        availableSlots: slots.filter(s => s.isAvailable).length,
        bookedSlots: slots.filter(s => !s.isAvailable).length,
        slots
      }
    })
  } catch (error) {
    console.error('Error fetching available slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available slots' },
      { status: 500 }
    )
  }
}
