'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, StatCard } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

interface ReportData {
  totalRevenue: number
  totalCollection: number
  totalPending: number
  totalExpenses: number
  totalAdmissions: number
  totalDischarges: number
  paymentsByMode: { mode: string; amount: number }[]
  topServices: { name: string; count: number; amount: number }[]
}

export default function ReportsPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState<ReportData>({
    totalRevenue: 0,
    totalCollection: 0,
    totalPending: 0,
    totalExpenses: 0,
    totalAdmissions: 0,
    totalDischarges: 0,
    paymentsByMode: [],
    topServices: [],
  })

  useEffect(() => {
    fetchReportData()
  }, [startDate, endDate])

  async function fetchReportData() {
    setLoading(true)

    try {
      // Total revenue from bills
      const { data: bills } = await supabase
        .from('bills')
        .select('net_amount, amount_received')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')

      const totalRevenue = bills?.reduce((sum, b) => sum + Number(b.net_amount), 0) || 0
      const totalCollection = bills?.reduce((sum, b) => sum + Number(b.amount_received), 0) || 0
      const totalPending = totalRevenue - totalCollection

      // Total expenses (admin only)
      let totalExpenses = 0
      if (profile?.role === 'admin') {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .gte('expense_date', startDate)
          .lte('expense_date', endDate)

        totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
      }

      // Admissions count
      const { count: totalAdmissions } = await supabase
        .from('admissions')
        .select('*', { count: 'exact', head: true })
        .gte('admission_date', startDate)
        .lte('admission_date', endDate + 'T23:59:59')

      // Discharges count
      const { count: totalDischarges } = await supabase
        .from('admissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Discharged')
        .gte('discharge_date', startDate)
        .lte('discharge_date', endDate + 'T23:59:59')

      // Payments by mode
      const { data: payments } = await supabase
        .from('payments')
        .select('payment_mode, amount')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate + 'T23:59:59')

      const paymentsByModeMap: Record<string, number> = {}
      payments?.forEach(p => {
        paymentsByModeMap[p.payment_mode] = (paymentsByModeMap[p.payment_mode] || 0) + Number(p.amount)
      })
      const paymentsByMode = Object.entries(paymentsByModeMap).map(([mode, amount]) => ({ mode, amount }))

      // Top services
      const { data: billItems } = await supabase
        .from('bill_items')
        .select('service_name, total_amount')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')

      const servicesMap: Record<string, { count: number; amount: number }> = {}
      billItems?.forEach(item => {
        if (!servicesMap[item.service_name]) {
          servicesMap[item.service_name] = { count: 0, amount: 0 }
        }
        servicesMap[item.service_name].count++
        servicesMap[item.service_name].amount += Number(item.total_amount)
      })

      const topServices = Object.entries(servicesMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)

      setData({
        totalRevenue,
        totalCollection,
        totalPending,
        totalExpenses,
        totalAdmissions: totalAdmissions || 0,
        totalDischarges: totalDischarges || 0,
        paymentsByMode,
        topServices,
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Reports</h1>

      <Card className="mb-6">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button onClick={fetchReportData}>Refresh</Button>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading reports...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="Total Revenue"
              value={`₹ ${data.totalRevenue.toLocaleString()}`}
              color="blue"
            />
            <StatCard
              title="Total Collection"
              value={`₹ ${data.totalCollection.toLocaleString()}`}
              color="green"
            />
            <StatCard
              title="Pending Amount"
              value={`₹ ${data.totalPending.toLocaleString()}`}
              color="yellow"
            />
            {profile?.role === 'admin' && (
              <>
                <StatCard
                  title="Total Expenses"
                  value={`₹ ${data.totalExpenses.toLocaleString()}`}
                  color="red"
                />
                <StatCard
                  title="Net Profit"
                  value={`₹ ${(data.totalCollection - data.totalExpenses).toLocaleString()}`}
                  color={data.totalCollection - data.totalExpenses >= 0 ? 'green' : 'red'}
                />
              </>
            )}
            <StatCard
              title="Admissions"
              value={data.totalAdmissions}
              color="purple"
            />
            <StatCard
              title="Discharges"
              value={data.totalDischarges}
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Collection by Payment Mode">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.paymentsByMode.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-gray-500 py-4">
                        No payments in this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.paymentsByMode.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.mode}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹ {item.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <Card title="Top 10 Services">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                        No services billed in this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.topServices.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹ {item.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
