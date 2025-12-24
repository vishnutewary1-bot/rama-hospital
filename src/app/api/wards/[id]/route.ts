import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET single ward
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data: ward, error } = await supabase
      .from('wards')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!ward) {
      return NextResponse.json(
        { error: 'Ward not found' },
        { status: 404 }
      )
    }

    // Get beds information for this ward
    const { data: beds } = await supabase
      .from('beds')
      .select(`
        *,
        admission:admissions(
          patient:patients(name, registration_number)
        )
      `)
      .eq('ward_id', id)

    const availableBeds = beds?.filter(b => b.status === 'available').length || 0
    const occupiedBeds = beds?.filter(b => b.status === 'occupied').length || 0

    const wardWithDetails = {
      ...ward,
      available_beds: availableBeds,
      occupied_beds: occupiedBeds,
      beds: beds || []
    }

    return NextResponse.json({ success: true, data: wardWithDetails })
  } catch (error) {
    console.error('Error fetching ward:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ward' },
      { status: 500 }
    )
  }
}

// PUT update ward
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data, error } = await supabase
      .from('wards')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating ward:', error)
    return NextResponse.json(
      { error: 'Failed to update ward' },
      { status: 500 }
    )
  }
}
