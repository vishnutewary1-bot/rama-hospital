import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST submit test results
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { results, result_entered_by, verify = false, verified_by } = body

    // Insert or update test results
    if (results && results.length > 0) {
      const resultData = results.map((result: any) => ({
        patient_test_id: id,
        parameter_id: result.parameter_id,
        value: result.value,
        is_abnormal: result.is_abnormal || false,
        is_critical: result.is_critical || false,
        remarks: result.remarks,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Delete existing results and insert new ones
      await supabase
        .from('patient_test_results')
        .delete()
        .eq('patient_test_id', id)

      const { error: resultsError } = await supabase
        .from('patient_test_results')
        .insert(resultData)

      if (resultsError) throw resultsError
    }

    // Update patient test status
    const updateData: any = {
      result_entered_at: new Date().toISOString(),
      result_entered_by: result_entered_by,
      status: verify ? 'verified' : 'completed'
    }

    if (verify && verified_by) {
      updateData.verified_at = new Date().toISOString()
      updateData.verified_by = verified_by
    }

    const { data, error } = await supabase
      .from('patient_tests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error submitting test results:', error)
    return NextResponse.json(
      { error: 'Failed to submit test results' },
      { status: 500 }
    )
  }
}
