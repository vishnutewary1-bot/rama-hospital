import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('admissions')
      .select(`
        *,
        patient:patients(*),
        doctor:doctors(*),
        ward:wards(*),
        bed:beds(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching admission:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admission' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data, error } = await supabase
      .from('admissions')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating admission:', error)
    return NextResponse.json(
      { error: 'Failed to update admission' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if admission can be deleted (no bills, etc.)
    const { data: bill } = await supabase
      .from('bills')
      .select('id')
      .eq('admission_id', id)
      .single()

    if (bill) {
      return NextResponse.json(
        { error: 'Cannot delete admission with existing bills' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('admissions')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting admission:', error)
    return NextResponse.json(
      { error: 'Failed to delete admission' },
      { status: 500 }
    )
  }
}
