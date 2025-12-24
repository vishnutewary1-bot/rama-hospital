import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pharmacySaleSchema } from '@/lib/validations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET all sales with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patient_id = searchParams.get('patient_id')
    const sale_type = searchParams.get('sale_type')
    const payment_status = searchParams.get('payment_status')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const search = searchParams.get('search')

    let query = supabase
      .from('pharmacy_sales')
      .select(`
        *,
        patient:patients(id, name, registration_number, mobile),
        doctor:doctors(id, name, specialization),
        admission:admissions(id, admission_number),
        dispensed_by_user:users!pharmacy_sales_dispensed_by_fkey(id, full_name),
        items:pharmacy_sale_items(
          id,
          quantity,
          unit_price,
          total_amount,
          medicine:pharmacy_medicines(id, name, unit_type),
          stock:pharmacy_stock(batch_number, expiry_date)
        )
      `)
      .order('created_at', { ascending: false })

    if (patient_id) {
      query = query.eq('patient_id', patient_id)
    }

    if (sale_type) {
      query = query.eq('sale_type', sale_type)
    }

    if (payment_status) {
      query = query.eq('payment_status', payment_status)
    }

    if (start_date) {
      query = query.gte('created_at', start_date)
    }

    if (end_date) {
      query = query.lte('created_at', end_date)
    }

    if (search) {
      query = query.or(`sale_number.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    )
  }
}

// POST create new sale
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validatedData = pharmacySaleSchema.parse(body)

    // Generate sale number
    const { data: lastSale } = await supabase
      .from('pharmacy_sales')
      .select('sale_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const lastNumber = lastSale?.sale_number?.match(/\d+$/)?.[0] || '0'
    const sale_number = `PS${String(parseInt(lastNumber) + 1).padStart(6, '0')}`

    // Verify stock availability for all items
    for (const item of validatedData.items) {
      const { data: stock } = await supabase
        .from('pharmacy_stock')
        .select('quantity_available')
        .eq('id', item.stock_id)
        .single()

      if (!stock || stock.quantity_available < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for item. Available: ${stock?.quantity_available || 0}, Requested: ${item.quantity}` },
          { status: 400 }
        )
      }
    }

    // Calculate totals
    const total_amount = validatedData.items.reduce((sum, item) => sum + item.total_amount, 0)
    const tax_amount = validatedData.items.reduce((sum, item) =>
      sum + (item.total_amount * item.tax_percentage / 100), 0
    )
    const net_amount = total_amount + tax_amount - (validatedData.discount_amount || 0)

    // Create sale record
    const { data: sale, error: saleError } = await supabase
      .from('pharmacy_sales')
      .insert({
        sale_number,
        patient_id: validatedData.patient_id,
        admission_id: validatedData.admission_id,
        bill_id: validatedData.bill_id,
        prescription_id: validatedData.prescription_id,
        sale_type: validatedData.sale_type,
        doctor_id: validatedData.doctor_id,
        total_amount,
        discount_amount: validatedData.discount_amount,
        tax_amount,
        net_amount,
        payment_mode: validatedData.payment_mode,
        payment_status: validatedData.payment_status,
        remarks: validatedData.remarks,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saleError) throw saleError

    // Create sale items
    const saleItems = validatedData.items.map(item => ({
      sale_id: sale.id,
      stock_id: item.stock_id,
      medicine_id: item.medicine_id,
      batch_number: item.batch_number,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percentage: item.discount_percentage,
      tax_percentage: item.tax_percentage,
      total_amount: item.total_amount,
      expiry_date: item.expiry_date,
      created_at: new Date().toISOString()
    }))

    const { error: itemsError } = await supabase
      .from('pharmacy_sale_items')
      .insert(saleItems)

    if (itemsError) {
      // Rollback sale if items insertion fails
      await supabase.from('pharmacy_sales').delete().eq('id', sale.id)
      throw itemsError
    }

    // Fetch complete sale data with relations
    const { data: completeSale, error: fetchError } = await supabase
      .from('pharmacy_sales')
      .select(`
        *,
        patient:patients(id, name, registration_number),
        doctor:doctors(id, name),
        items:pharmacy_sale_items(
          *,
          medicine:pharmacy_medicines(id, name, unit_type),
          stock:pharmacy_stock(batch_number, expiry_date)
        )
      `)
      .eq('id', sale.id)
      .single()

    if (fetchError) throw fetchError

    return NextResponse.json({ success: true, data: completeSale }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating sale:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    )
  }
}
