import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const billId = id

    // Get current bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', billId)
      .single()

    if (billError || !bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      )
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        bill_id: billId,
        amount: body.amount,
        mode: body.mode,
        reference_number: body.reference_number,
        notes: body.notes,
        received_by: body.received_by,
        payment_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    // Update bill amounts
    const newPaidAmount = (bill.paid_amount || 0) + body.amount
    const newDueAmount = bill.total - newPaidAmount

    let newStatus = bill.status
    if (newDueAmount <= 0) {
      newStatus = 'Paid'
    } else if (newPaidAmount > 0) {
      newStatus = 'Partial'
    }

    const { error: updateError } = await supabase
      .from('bills')
      .update({
        paid_amount: newPaidAmount,
        due_amount: newDueAmount,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', billId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, data: payment }, { status: 201 })
  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
