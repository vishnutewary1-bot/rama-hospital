import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET single patient test
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('patient_tests')
      .select(`
        *,
        patient:patients(name, registration_number, phone, age, gender),
        test:pathology_tests(
          *,
          category:pathology_categories(name),
          parameters:pathology_test_parameters(*)
        ),
        doctor:doctors(name, specialization),
        results:patient_test_results(
          *,
          parameter:pathology_test_parameters(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Patient test not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching patient test:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patient test' },
      { status: 500 }
    )
  }
}

// PUT update patient test
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data, error } = await supabase
      .from('patient_tests')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating patient test:', error)
    return NextResponse.json(
      { error: 'Failed to update patient test' },
      { status: 500 }
    )
  }
}
