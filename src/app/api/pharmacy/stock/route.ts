import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pharmacyStockSchema } from '@/lib/validations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET all stock with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const medicine_id = searchParams.get('medicine_id')
    const supplier_id = searchParams.get('supplier_id')
    const is_expired = searchParams.get('is_expired')
    const low_stock = searchParams.get('low_stock')
    const search = searchParams.get('search')

    let query = supabase
      .from('pharmacy_stock')
      .select(`
        *,
        medicine:pharmacy_medicines(
          id,
          name,
          generic_name,
          unit_type,
          reorder_level
        ),
        supplier:pharmacy_suppliers(id, name, contact_person)
      `)
      .order('created_at', { ascending: false })

    if (medicine_id) {
      query = query.eq('medicine_id', medicine_id)
    }

    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id)
    }

    if (is_expired === 'true') {
      query = query.eq('is_expired', true)
    } else if (is_expired === 'false') {
      query = query.eq('is_expired', false)
    }

    if (low_stock === 'true') {
      // This will need to be filtered post-query as it depends on medicine's reorder_level
      query = query.gt('quantity_available', 0)
    }

    if (search) {
      query = query.or(`batch_number.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    // Filter low stock items if requested
    let filteredData = data
    if (low_stock === 'true' && data) {
      filteredData = data.filter((stock: any) =>
        stock.medicine && stock.quantity_available <= stock.medicine.reorder_level
      )
    }

    return NextResponse.json({ success: true, data: filteredData })
  } catch (error) {
    console.error('Error fetching stock:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock' },
      { status: 500 }
    )
  }
}

// POST create new stock entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validatedData = pharmacyStockSchema.parse(body)

    // Check if batch number already exists for this medicine
    const { data: existingStock } = await supabase
      .from('pharmacy_stock')
      .select('id')
      .eq('medicine_id', validatedData.medicine_id)
      .eq('batch_number', validatedData.batch_number)
      .single()

    if (existingStock) {
      return NextResponse.json(
        { error: 'Stock with this batch number already exists for this medicine' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('pharmacy_stock')
      .insert({
        ...validatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        medicine:pharmacy_medicines(
          id,
          name,
          generic_name,
          unit_type
        ),
        supplier:pharmacy_suppliers(id, name)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating stock:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create stock entry' },
      { status: 500 }
    )
  }
}
