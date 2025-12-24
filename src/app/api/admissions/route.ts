import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const ward = searchParams.get('ward')

    let query = supabase
      .from('admissions')
      .select(`
        *,
        patient:patients(name, registration_number, phone),
        ward:wards(name, type),
        bed:beds(bed_number),
        doctor:doctors(name, specialization)
      `)
      .order('admission_date', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (ward) {
      query = query.eq('ward_id', ward)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching admissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admissions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Generate admission number if not provided
    if (!body.admission_number) {
      const { data: lastAdmission } = await supabase
        .from('admissions')
        .select('admission_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const lastNumber = lastAdmission?.admission_number?.match(/\d+$/)?.[0] || '0'
      body.admission_number = `ADM${String(parseInt(lastNumber) + 1).padStart(6, '0')}`
    }

    // Update bed status to occupied
    if (body.bed_id) {
      await supabase
        .from('beds')
        .update({ status: 'occupied' })
        .eq('id', body.bed_id)
    }

    const { data, error } = await supabase
      .from('admissions')
      .insert({
        ...body,
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Error creating admission:', error)
    return NextResponse.json(
      { error: 'Failed to create admission' },
      { status: 500 }
    )
  }
}
