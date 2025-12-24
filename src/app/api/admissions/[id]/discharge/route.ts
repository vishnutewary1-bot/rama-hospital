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
    const { status, discharge_summary } = body

    // Get admission details
    const { data: admission, error: admissionError } = await supabase
      .from('admissions')
      .select('bed_id')
      .eq('id', id)
      .single()

    if (admissionError) throw admissionError

    // Update admission
    const { data, error } = await supabase
      .from('admissions')
      .update({
        status,
        discharge_date: new Date().toISOString(),
        discharge_summary,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Free up the bed
    if (admission.bed_id) {
      await supabase
        .from('beds')
        .update({
          status: 'available',
          current_admission_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', admission.bed_id)
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error discharging patient:', error)
    return NextResponse.json(
      { error: 'Failed to discharge patient' },
      { status: 500 }
    )
  }
}
