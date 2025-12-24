import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET all beds with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wardId = searchParams.get('ward_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('beds')
      .select(`
        *,
        ward:wards(name, type, floor),
        admission:admissions(
          admission_number,
          patient:patients(name, registration_number)
        )
      `)
      .order('bed_number', { ascending: true })

    if (wardId) {
      query = query.eq('ward_id', wardId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching beds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch beds' },
      { status: 500 }
    )
  }
}

// POST create new bed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('beds')
      .insert({
        ...body,
        status: body.status || 'available',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Error creating bed:', error)
    return NextResponse.json(
      { error: 'Failed to create bed' },
      { status: 500 }
    )
  }
}
