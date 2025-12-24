import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pharmacyMedicineSchema } from '@/lib/validations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET all medicines with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category_id = searchParams.get('category_id')
    const is_active = searchParams.get('is_active')
    const is_prescription_required = searchParams.get('is_prescription_required')

    let query = supabase
      .from('pharmacy_medicines')
      .select(`
        *,
        category:pharmacy_categories(id, name, description)
      `)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%,manufacturer.ilike.%${search}%`)
    }

    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    if (is_active !== null && is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }

    if (is_prescription_required !== null && is_prescription_required !== undefined) {
      query = query.eq('is_prescription_required', is_prescription_required === 'true')
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching medicines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medicines' },
      { status: 500 }
    )
  }
}

// POST create new medicine
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validatedData = pharmacyMedicineSchema.parse(body)

    const { data, error } = await supabase
      .from('pharmacy_medicines')
      .insert({
        ...validatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        category:pharmacy_categories(id, name, description)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating medicine:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create medicine' },
      { status: 500 }
    )
  }
}
