'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Bill } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchBills()
  }, [statusFilter])

  async function fetchBills() {
    try {
      let query = supabase
        .from('bills')
        .select(`
          *,
          patient:patients(name, registration_number),
          admission:admissions(admission_number, status)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setBills(data || [])
    } catch (error) {
      console.error('Error fetching bills:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBills = bills.filter(b =>
    b.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.bill_number.toLowerCase().includes(search.toLowerCase()) ||
    b.patient?.registration_number?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="text-center py-8">Loading bills...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Billing</h1>
      </div>

      <Card>
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by patient name, bill number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Partial', label: 'Partial' },
                { value: 'Paid', label: 'Paid' },
              ]}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill No.</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Admission</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  No bills found
                </TableCell>
              </TableRow>
            ) : (
              filteredBills.map((bill) => {
                const pending = bill.net_amount - bill.amount_received
                return (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.bill_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{bill.patient?.name}</p>
                        <p className="text-sm text-gray-500">{bill.patient?.registration_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${
                        bill.admission?.status === 'Active'
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}>
                        {bill.admission?.admission_number}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">₹ {bill.net_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-600">
                      ₹ {bill.amount_received.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      ₹ {pending.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-sm ${
                        bill.status === 'Paid'
                          ? 'bg-green-100 text-green-700'
                          : bill.status === 'Partial'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {bill.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/billing/${bill.admission_id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                        {bill.status !== 'Paid' && pending > 0 && (
                          <Link href={`/billing/${bill.admission_id}?payment=true`}>
                            <Button size="sm" variant="success">Pay</Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
