'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Expense, ExpenseCategory } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, StatCard } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    fetchCategories()
    fetchExpenses()
  }, [dateFilter, categoryFilter])

  async function fetchCategories() {
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    setCategories(data || [])
  }

  async function fetchExpenses() {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        category:expense_categories(name)
      `)
      .order('expense_date', { ascending: false })
      .limit(100)

    if (dateFilter) {
      query = query.eq('expense_date', dateFilter)
    }

    if (categoryFilter) {
      query = query.eq('category_id', categoryFilter)
    }

    const { data } = await query
    setExpenses(data || [])
    setLoading(false)
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  if (loading) {
    return <div className="text-center py-8">Loading expenses...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Expense Management</h1>
        <Link href="/expenses/new">
          <Button size="lg">+ Add Expense</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Expenses (Filtered)"
          value={`₹ ${totalExpenses.toLocaleString()}`}
          color="red"
        />
      </div>

      <Card>
        <div className="flex gap-4 mb-4">
          <div className="w-48">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map(c => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setDateFilter('')
              setCategoryFilter('')
            }}
          >
            Clear Filters
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  No expenses found
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {expense.category?.name}
                    </span>
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.vendor_name || '-'}</TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    ₹ {expense.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
