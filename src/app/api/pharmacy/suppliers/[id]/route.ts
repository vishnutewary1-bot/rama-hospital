import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pharmacySupplierSchema } from '@/lib/validations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET single supplier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('pharmacy_suppliers')
      .select(`
        *,
        stock:pharmacy_stock(
          id,
          batch_number,
          purchase_date,
          quantity_purchased,
          quantity_available,
          medicine:pharmacy_medicines(id, name, unit_type)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching supplier:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    )
  }
}

// PATCH update supplier
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate input (partial validation for updates)
    const validatedData = pharmacySupplierSchema.partial().parse(body)

    // Check if updating name and if it conflicts with existing supplier
    if (validatedData.name) {
      const { data: existingSupplier } = await supabase
        .from('pharmacy_suppliers')
        .select('id')
        .ilike('name', validatedData.name)
        .neq('id', id)
        .single()

      if (existingSupplier) {
        return NextResponse.json(
          { error: 'Supplier with this name already exists' },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('pharmacy_suppliers')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error updating supplier:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    )
  }
}

// DELETE supplier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if supplier has any stock entries
    const { data: stockData, error: stockError } = await supabase
      .from('pharmacy_stock')
      .select('id')
      .eq('supplier_id', id)
      .limit(1)

    if (stockError) throw stockError

    if (stockData && stockData.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete supplier with existing stock entries. Consider marking as inactive instead.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('pharmacy_suppliers')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    )
  }
}
