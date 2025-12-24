import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET all patient tests with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patient_id')
    const admissionId = searchParams.get('admission_id')
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('patient_tests')
      .select(`
        *,
        patient:patients(name, registration_number, phone),
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
      .order('order_date', { ascending: false })

    if (patientId) {
      query = query.eq('patient_id', patientId)
    }

    if (admissionId) {
      query = query.eq('admission_id', admissionId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('order_date', startDate)
    }

    if (endDate) {
      query = query.lte('order_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching patient tests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patient tests' },
      { status: 500 }
    )
  }
}

// POST create new patient test order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.patient_id || !body.test_id) {
      return NextResponse.json(
        { error: 'patient_id and test_id are required' },
        { status: 400 }
      )
    }

    // Generate order number if not provided
    if (!body.order_number) {
      const date = new Date()
      const year = date.getFullYear().toString().slice(-2)
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      body.order_number = `LAB${year}${month}${day}${random}`
    }

    // Generate sample barcode if not provided
    if (!body.sample_barcode && body.test_id) {
      const shortTestId = body.test_id.slice(-4).toUpperCase()
      body.sample_barcode = `${body.order_number}-${shortTestId}`
    }

    const testData = {
      ...body,
      order_date: body.order_date || new Date().toISOString(),
      status: body.status || 'ordered',
      sample_collected: body.sample_collected || false,
      created_at: new Date().toISOString()
    }

    // Insert test order
    const { data: test, error: testError } = await supabase
      .from('patient_tests')
      .insert(testData)
      .select(`
        *,
        patient:patients(name, registration_number),
        test:pathology_tests(name, sample_type, price)
      `)
      .single()

    if (testError) throw testError

    // Get test parameters and create result entries
    const { data: parameters, error: paramsError } = await supabase
      .from('pathology_test_parameters')
      .select('*')
      .eq('test_id', body.test_id)
      .eq('is_active', true)
      .order('display_order')

    if (!paramsError && parameters && parameters.length > 0) {
      const resultEntries = parameters.map((param: any) => ({
        patient_test_id: test.id,
        parameter_id: param.id,
        is_abnormal: false,
        is_critical: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: resultsError } = await supabase
        .from('patient_test_results')
        .insert(resultEntries)

      if (resultsError) {
        console.error('Error creating result entries:', resultsError)
        // Don't fail the request if result entries fail
      }
    }

    return NextResponse.json({ success: true, data: test }, { status: 201 })
  } catch (error) {
    console.error('Error creating patient test:', error)
    return NextResponse.json(
      { error: 'Failed to create patient test' },
      { status: 500 }
    )
  }
}
