import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pharmacyStockBaseSchema } from '@/lib/validations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET single stock entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('pharmacy_stock')
      .select(`
        *,
        medicine:pharmacy_medicines(
          id,
          name,
          generic_name,
          unit_type,
          manufacturer,
          strength
        ),
        supplier:pharmacy_suppliers(id, name, contact_person, phone),
        sale_items:pharmacy_sale_items(
          id,
          quantity,
          sale:pharmacy_sales(id, sale_number, created_at)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Stock entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching stock:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock entry' },
      { status: 500 }
    )
  }
}

// PATCH update stock entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate input (partial validation for updates)
    const validatedData = pharmacyStockBaseSchema.partial().parse(body)

    // If updating batch number or medicine, check for duplicates
    if (validatedData.batch_number || validatedData.medicine_id) {
      const { data: currentStock } = await supabase
        .from('pharmacy_stock')
        .select('medicine_id, batch_number')
        .eq('id', id)
        .single()

      const medicine_id = validatedData.medicine_id || currentStock?.medicine_id
      const batch_number = validatedData.batch_number || currentStock?.batch_number

      if (medicine_id && batch_number) {
        const { data: existingStock } = await supabase
          .from('pharmacy_stock')
          .select('id')
          .eq('medicine_id', medicine_id)
          .eq('batch_number', batch_number)
          .neq('id', id)
          .single()

        if (existingStock) {
          return NextResponse.json(
            { error: 'Stock with this batch number already exists for this medicine' },
            { status: 400 }
          )
        }
      }
    }

    const { data, error } = await supabase
      .from('pharmacy_stock')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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

    if (!data) {
      return NextResponse.json(
        { error: 'Stock entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error updating stock:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update stock entry' },
      { status: 500 }
    )
  }
}

// DELETE stock entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if this stock has been used in any sales
    const { data: saleItems, error: saleError } = await supabase
      .from('pharmacy_sale_items')
      .select('id')
      .eq('stock_id', id)
      .limit(1)

    if (saleError) throw saleError

    if (saleItems && saleItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete stock that has been used in sales. Consider marking it as inactive instead.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('pharmacy_stock')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting stock:', error)
    return NextResponse.json(
      { error: 'Failed to delete stock entry' },
      { status: 500 }
    )
  }
}
