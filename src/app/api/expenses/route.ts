import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET all expenses with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('expenses')
      .select(`
        *,
        category:expense_categories(name, description)
      `)
      .order('expense_date', { ascending: false })

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('expense_date', startDate)
    }

    if (endDate) {
      query = query.lte('expense_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

// POST create new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Generate expense number if not provided
    if (!body.expense_number) {
      const { data: lastExpense } = await supabase
        .from('expenses')
        .select('expense_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const lastNumber = lastExpense?.expense_number?.match(/\d+$/)?.[0] || '0'
      body.expense_number = `EXP${String(parseInt(lastNumber) + 1).padStart(6, '0')}`
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        ...body,
        expense_date: body.expense_date || new Date().toISOString(),
        status: body.status || (body.requires_approval ? 'pending' : 'approved'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}
