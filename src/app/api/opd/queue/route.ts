import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET today's OPD queue
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctor_id = searchParams.get('doctor_id')
    const status = searchParams.get('status')

    // Use the opd_queue view for optimized query
    let query = supabase
      .from('opd_queue')
      .select('*')
      .order('token_number', { ascending: true })

    // Additional filters
    if (doctor_id) {
      query = query.eq('doctor_id', doctor_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      // If the view doesn't exist or there's an error, fall back to direct query
      console.warn('Error querying opd_queue view, falling back to direct query:', error)

      let fallbackQuery = supabase
        .from('opd_registrations')
        .select(`
          id,
          registration_number,
          token_number,
          patient_id,
          doctor_id,
          visit_type,
          visit_reason,
          status,
          checked_in_at,
          consultation_started_at,
          created_at,
          patient:patients(
            id,
            name,
            age,
            age_unit,
            gender,
            mobile
          ),
          doctor:doctors(
            id,
            name,
            specialization
          )
        `)
        .eq('visit_date', new Date().toISOString().split('T')[0])
        .in('status', ['Waiting', 'In-Consultation'])
        .order('token_number', { ascending: true })

      if (doctor_id) {
        fallbackQuery = fallbackQuery.eq('doctor_id', doctor_id)
      }

      if (status) {
        fallbackQuery = fallbackQuery.eq('status', status)
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery

      if (fallbackError) throw fallbackError

      // Calculate waiting time for each entry
      const queueData = fallbackData?.map((entry: any) => {
        let waiting_time_minutes = null
        if (entry.status === 'Waiting' && entry.checked_in_at) {
          const now = new Date()
          const checkedIn = new Date(entry.checked_in_at)
          waiting_time_minutes = Math.floor((now.getTime() - checkedIn.getTime()) / (1000 * 60))
        }

        return {
          ...entry,
          patient_name: entry.patient?.name,
          patient_age: entry.patient?.age,
          patient_gender: entry.patient?.gender,
          patient_mobile: entry.patient?.mobile,
          doctor_name: entry.doctor?.name,
          doctor_specialization: entry.doctor?.specialization,
          waiting_time_minutes
        }
      })

      return NextResponse.json({ success: true, data: queueData })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching OPD queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OPD queue' },
      { status: 500 }
    )
  }
}
