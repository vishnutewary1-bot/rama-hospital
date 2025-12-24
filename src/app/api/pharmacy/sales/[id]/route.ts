import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET single sale with complete details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('pharmacy_sales')
      .select(`
        *,
        patient:patients(
          id,
          name,
          registration_number,
          mobile,
          age,
          gender,
          address
        ),
        doctor:doctors(
          id,
          name,
          specialization,
          qualification
        ),
        admission:admissions(
          id,
          admission_number,
          ward:wards(name),
          bed:beds(bed_number)
        ),
        bill:bills(
          id,
          bill_number,
          total_amount,
          payment_status
        ),
        prescription:medical_records(
          id,
          record_type,
          prescriptions,
          diagnosis
        ),
        dispensed_by_user:users!pharmacy_sales_dispensed_by_fkey(
          id,
          full_name,
          email
        ),
        items:pharmacy_sale_items(
          id,
          quantity,
          unit_price,
          discount_percentage,
          tax_percentage,
          total_amount,
          batch_number,
          expiry_date,
          medicine:pharmacy_medicines(
            id,
            name,
            generic_name,
            unit_type,
            strength,
            manufacturer
          ),
          stock:pharmacy_stock(
            id,
            batch_number,
            expiry_date,
            selling_price,
            mrp
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching sale:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sale details' },
      { status: 500 }
    )
  }
}
