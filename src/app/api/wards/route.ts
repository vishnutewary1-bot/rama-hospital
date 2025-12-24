import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET all wards with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const floor = searchParams.get('floor')
    const isActive = searchParams.get('is_active')

    let query = supabase
      .from('wards')
      .select('*')
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    if (floor) {
      query = query.eq('floor', floor)
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: wards, error } = await query

    if (error) throw error

    // Calculate available and occupied beds for each ward
    if (wards) {
      const wardsWithCounts = await Promise.all(
        wards.map(async (ward) => {
          const { data: beds } = await supabase
            .from('beds')
            .select('status')
            .eq('ward_id', ward.id)

          const availableBeds = beds?.filter(b => b.status === 'available').length || 0
          const occupiedBeds = beds?.filter(b => b.status === 'occupied').length || 0

          return {
            ...ward,
            available_beds: availableBeds,
            occupied_beds: occupiedBeds
          }
        })
      )

      return NextResponse.json({ success: true, data: wardsWithCounts })
    }

    return NextResponse.json({ success: true, data: wards })
  } catch (error) {
    console.error('Error fetching wards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wards' },
      { status: 500 }
    )
  }
}

// POST create new ward
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('wards')
      .insert({
        ...body,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Error creating ward:', error)
    return NextResponse.json(
      { error: 'Failed to create ward' },
      { status: 500 }
    )
  }
}
