import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('bills')
      .select(`
        *,
        patient:patients(name, registration_number, phone),
        admission:admissions(admission_number),
        items:bill_items(
          *,
          service:services(name, category)
        ),
        payments:payments(*)
      `)
      .order('bill_date', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (startDate) {
      query = query.gte('bill_date', startDate)
    }

    if (endDate) {
      query = query.lte('bill_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching bills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Generate bill number if not provided
    if (!body.bill_number) {
      const { data: lastBill } = await supabase
        .from('bills')
        .select('bill_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const lastNumber = lastBill?.bill_number?.match(/\d+$/)?.[0] || '0'
      body.bill_number = `BILL${String(parseInt(lastNumber) + 1).padStart(6, '0')}`
    }

    // Calculate totals
    const subtotal = body.items?.reduce((sum: number, item: any) =>
      sum + (item.quantity * item.rate), 0) || 0

    const discount = body.discount || 0
    const tax = body.tax || 0
    const total = subtotal - discount + tax

    const billData = {
      ...body,
      subtotal,
      total,
      paid_amount: 0,
      due_amount: total,
      status: total === 0 ? 'Paid' : 'Draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { items, ...billWithoutItems } = billData

    // Insert bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .insert(billWithoutItems)
      .select()
      .single()

    if (billError) throw billError

    // Insert bill items
    if (items && items.length > 0) {
      const billItems = items.map((item: any) => ({
        ...item,
        bill_id: bill.id,
        created_at: new Date().toISOString()
      }))

      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(billItems)

      if (itemsError) throw itemsError
    }

    return NextResponse.json({ success: true, data: bill }, { status: 201 })
  } catch (error) {
    console.error('Error creating bill:', error)
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    )
  }
}
