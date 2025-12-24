import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { appointmentSchema } from '@/lib/validations'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET single appointment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(
          id,
          name,
          age,
          gender,
          mobile,
          email,
          address,
          blood_group
        ),
        doctor:doctors(
          id,
          name,
          specialization,
          consultation_fee,
          phone,
          email
        ),
        opd_registration:opd_registrations(
          id,
          registration_number,
          status,
          token_number
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    )
  }
}

// PATCH update appointment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Create a partial schema for updates (all fields optional)
    const { appointmentBaseSchema } = await import('@/lib/validations')
    const updateSchema = appointmentBaseSchema.partial()
    const validatedData = updateSchema.parse(body)

    // If updating date/time, perform availability checks
    if (validatedData.appointment_date || validatedData.appointment_time || validatedData.doctor_id) {
      // Get current appointment data
      const { data: currentAppointment } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single()

      if (!currentAppointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        )
      }

      const doctorId = validatedData.doctor_id || currentAppointment.doctor_id
      const appointmentDate = validatedData.appointment_date || currentAppointment.appointment_date
      const appointmentTime = validatedData.appointment_time || currentAppointment.appointment_time

      // Check if doctor is available on the requested date
      const dayOfWeek = new Date(appointmentDate).getDay()

      const { data: availability, error: availError } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
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
        .eq('doctor_id', doctorId)
        .eq('is_active', true)
        .lte('start_date', appointmentDate)
        .gte('end_date', appointmentDate)

      if (leaves && leaves.length > 0) {
        return NextResponse.json(
          { error: 'Doctor is on leave on the selected date' },
          { status: 400 }
        )
      }

      // Check if time slot is within doctor's availability
      const startTime = availability.start_time
      const endTime = availability.end_time

      if (appointmentTime < startTime || appointmentTime >= endTime) {
        return NextResponse.json(
          { error: 'Selected time is outside doctor\'s availability hours' },
          { status: 400 }
        )
      }

      // Check if slot is already booked (excluding current appointment)
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', appointmentDate)
        .eq('appointment_time', appointmentTime)
        .neq('id', id)
        .in('status', ['Scheduled', 'Confirmed'])

      if (existingAppointments && existingAppointments.length >= availability.max_patients_per_slot) {
        return NextResponse.json(
          { error: 'This time slot is already fully booked' },
          { status: 400 }
        )
      }
    }

    // Handle cancellation
    if (validatedData.status === 'Cancelled' && !body.cancellation_reason) {
      return NextResponse.json(
        { error: 'Cancellation reason is required when cancelling an appointment' },
        { status: 400 }
      )
    }

    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString()
    }

    // Add cancellation metadata
    if (validatedData.status === 'Cancelled') {
      updateData.cancelled_at = new Date().toISOString()
      updateData.cancellation_reason = body.cancellation_reason
    }

    // Add confirmation metadata
    if (validatedData.status === 'Confirmed') {
      updateData.confirmed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
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

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating appointment:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    )
  }
}

// DELETE appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if appointment exists and can be deleted
    const { data: appointment } = await supabase
      .from('appointments')
      .select('status, opd_registration_id')
      .eq('id', id)
      .single()

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of completed appointments
    if (appointment.status === 'Completed') {
      return NextResponse.json(
        { error: 'Cannot delete completed appointments' },
        { status: 400 }
      )
    }

    // Prevent deletion if OPD registration exists
    if (appointment.opd_registration_id) {
      return NextResponse.json(
        { error: 'Cannot delete appointment with OPD registration. Cancel instead.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Appointment deleted successfully' })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: 'Failed to delete appointment' },
      { status: 500 }
    )
  }
}
