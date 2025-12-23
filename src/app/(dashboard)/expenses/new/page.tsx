'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ExpenseCategory } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'

export default function NewExpensePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [formData, setFormData] = useState({
    category_id: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Cash',
    vendor_name: '',
    invoice_number: '',
    notes: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    setCategories(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.from('expenses').insert({
        category_id: formData.category_id,
        description: formData.description,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        payment_mode: formData.payment_mode,
        vendor_name: formData.vendor_name || null,
        invoice_number: formData.invoice_number || null,
        notes: formData.notes || null,
      })

      if (error) throw error

      router.push('/expenses')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add expense'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New Expense</h1>

      <Card className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <Select
            id="category_id"
            label="Category *"
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            required
          />

          <Input
            id="description"
            label="Description *"
            placeholder="What is this expense for?"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="amount"
              type="number"
              label="Amount (₹) *"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />

            <Input
              id="expense_date"
              type="date"
              label="Date *"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              required
            />
          </div>

          <Select
            id="payment_mode"
            label="Payment Mode"
            value={formData.payment_mode}
            onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'UPI', label: 'UPI' },
              { value: 'Bank Transfer', label: 'Bank Transfer' },
              { value: 'Cheque', label: 'Cheque' },
              { value: 'Card', label: 'Card' },
            ]}
          />

          <Input
            id="vendor_name"
            label="Vendor / Payee Name"
            placeholder="Who was paid?"
            value={formData.vendor_name}
            onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
          />

          <Input
            id="invoice_number"
            label="Invoice / Bill Number"
            placeholder="Reference number"
            value={formData.invoice_number}
            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
          />

          <Input
            id="notes"
            label="Notes"
            placeholder="Additional notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" size="lg" loading={loading}>
              Add Expense
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
