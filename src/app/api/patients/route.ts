import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET all patients with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const area = searchParams.get('area')
    const gender = searchParams.get('gender')

    let query = supabase
      .from('patients')
      .select(`
        *,
        area:areas(name),
        referral:referrals(name)
      `)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,registration_number.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    if (area) {
      query = query.eq('area_id', area)
    }

    if (gender) {
      query = query.eq('gender', gender)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching patients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}

// POST create new patient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Generate registration number if not provided
    if (!body.registration_number) {
      const { data: lastPatient } = await supabase
        .from('patients')
        .select('registration_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const lastNumber = lastPatient?.registration_number?.match(/\d+$/)?.[0] || '0'
      body.registration_number = `PAT${String(parseInt(lastNumber) + 1).padStart(6, '0')}`
    }

    const { data, error } = await supabase
      .from('patients')
      .insert({
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Error creating patient:', error)
    return NextResponse.json(
      { error: 'Failed to create patient' },
      { status: 500 }
    )
  }
}
