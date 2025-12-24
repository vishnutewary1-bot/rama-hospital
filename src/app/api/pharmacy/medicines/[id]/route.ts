import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pharmacyMedicineSchema } from '@/lib/validations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET single medicine
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('pharmacy_medicines')
      .select(`
        *,
        category:pharmacy_categories(id, name, description),
        stock:pharmacy_stock(
          id,
          batch_number,
          quantity_available,
          expiry_date,
          selling_price,
          mrp,
          supplier:pharmacy_suppliers(id, name)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Medicine not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching medicine:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medicine' },
      { status: 500 }
    )
  }
}

// PATCH update medicine
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate input (partial validation for updates)
    const validatedData = pharmacyMedicineSchema.partial().parse(body)

    const { data, error } = await supabase
      .from('pharmacy_medicines')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        category:pharmacy_categories(id, name, description)
      `)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Medicine not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error updating medicine:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update medicine' },
      { status: 500 }
    )
  }
}

// DELETE medicine
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if there's any stock for this medicine
    const { data: stockData, error: stockError } = await supabase
      .from('pharmacy_stock')
      .select('id')
      .eq('medicine_id', id)
      .limit(1)

    if (stockError) throw stockError

    if (stockData && stockData.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete medicine with existing stock. Please remove all stock entries first.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('pharmacy_medicines')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting medicine:', error)
    return NextResponse.json(
      { error: 'Failed to delete medicine' },
      { status: 500 }
    )
  }
}
