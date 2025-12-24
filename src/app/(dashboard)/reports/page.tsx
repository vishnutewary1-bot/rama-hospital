'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { dashboardService, billService, expenseService, admissionService, paymentService, billItemService } from '@/lib/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  UserPlus,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  PieChart,
  Activity,
  Receipt,
  CreditCard,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  BedDouble,
  FlaskConical
} from 'lucide-react'

interface ReportData {
  // Financial
  totalRevenue: number
  totalCollection: number
  totalPending: number
  totalExpenses: number
  netProfit: number
  collectionRate: number
  // Admissions
  totalAdmissions: number
  totalDischarges: number
  activeAdmissions: number
  averageStay: number
  // Breakdown
  paymentsByMode: { mode: string; amount: number; count: number }[]
  topServices: { name: string; count: number; amount: number }[]
  revenueByType: { type: string; amount: number }[]
  expensesByCategory: { category: string; amount: number }[]
  dailyCollection: { date: string; collection: number; bills: number }[]
  doctorWiseRevenue: { name: string; patients: number; revenue: number }[]
  wardWiseOccupancy: { ward: string; occupied: number; total: number; percentage: number }[]
}

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
]

export default function ReportsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [datePreset, setDatePreset] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [data, setData] = useState<ReportData>({
    totalRevenue: 0,
    totalCollection: 0,
    totalPending: 0,
    totalExpenses: 0,
    netProfit: 0,
    collectionRate: 0,
    totalAdmissions: 0,
    totalDischarges: 0,
    activeAdmissions: 0,
    averageStay: 0,
    paymentsByMode: [],
    topServices: [],
    revenueByType: [],
    expensesByCategory: [],
    dailyCollection: [],
    doctorWiseRevenue: [],
    wardWiseOccupancy: [],
  })

  const isAdmin = user?.role === 'admin'

  // Calculate dates based on preset
  useEffect(() => {
    const now = new Date()
    let start = new Date()
    let end = new Date()

    switch (datePreset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = now
        break
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        break
      case 'week':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        end = now
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = now
        break
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        start = new Date(now.getFullYear(), quarter * 3, 1)
        end = now
        break
      case 'year':
        start = new Date(now.getFullYear(), 0, 1)
        end = now
        break
    }

    if (datePreset !== 'custom') {
      setStartDate(start.toISOString().split('T')[0])
      setEndDate(end.toISOString().split('T')[0])
    }
  }, [datePreset])

  const fetchReportData = useCallback(async () => {
    if (!startDate || !endDate) return

    setLoading(true)
    try {
      // Fetch all bills in date range
      const bills = await billService.getByDateRange(startDate, endDate)

      const totalRevenue = bills.reduce((sum, b) => sum + b.net_amount, 0)
      const totalCollection = bills.reduce((sum, b) => sum + b.amount_received, 0)
      const totalPending = totalRevenue - totalCollection

      // Revenue by type
      const revenueByTypeMap: Record<string, number> = {}
      bills.forEach(b => {
        revenueByTypeMap[b.bill_type] = (revenueByTypeMap[b.bill_type] || 0) + b.net_amount
      })
      const revenueByType = Object.entries(revenueByTypeMap)
        .map(([type, amount]) => ({ type, amount }))
        .sort((a, b) => b.amount - a.amount)

      // Expenses (admin only)
      let totalExpenses = 0
      let expensesByCategory: { category: string; amount: number }[] = []
      if (isAdmin) {
        const expenses = await expenseService.getByDateRange(startDate, endDate)
        totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

        const expensesByCatMap: Record<string, number> = {}
        expenses.forEach(e => {
          const categoryName = e.category?.name || 'Uncategorized'
          expensesByCatMap[categoryName] = (expensesByCatMap[categoryName] || 0) + e.amount
        })
        expensesByCategory = Object.entries(expensesByCatMap)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount)
      }

      // Admissions
      const admissions = await admissionService.getByDateRange(startDate, endDate)
      const totalAdmissions = admissions.length
      const totalDischarges = admissions.filter(a => a.status === 'Discharged' || a.status === 'LAMA').length
      const activeAdmissions = admissions.filter(a => a.status === 'Active').length

      // Calculate average stay
      let totalStayDays = 0
      let stayCount = 0
      admissions.forEach(a => {
        if (a.discharge_date) {
          const stay = Math.ceil(
            (new Date(a.discharge_date).getTime() - new Date(a.admission_date).getTime()) / (1000 * 60 * 60 * 24)
          )
          totalStayDays += stay
          stayCount++
        }
      })
      const averageStay = stayCount > 0 ? totalStayDays / stayCount : 0

      // Payments by mode
      const payments = await paymentService.getByDateRange(startDate, endDate)
      const paymentsByModeMap: Record<string, { amount: number; count: number }> = {}
      payments.forEach(p => {
        if (!paymentsByModeMap[p.payment_mode]) {
          paymentsByModeMap[p.payment_mode] = { amount: 0, count: 0 }
        }
        paymentsByModeMap[p.payment_mode].amount += p.amount
        paymentsByModeMap[p.payment_mode].count++
      })
      const paymentsByMode = Object.entries(paymentsByModeMap)
        .map(([mode, data]) => ({ mode, ...data }))
        .sort((a, b) => b.amount - a.amount)

      // Top services (fetch from bill items)
      const billItems = await billItemService.getByDateRange(startDate, endDate)
      const servicesMap: Record<string, { count: number; amount: number }> = {}
      billItems.forEach(item => {
        if (!servicesMap[item.service_name]) {
          servicesMap[item.service_name] = { count: 0, amount: 0 }
        }
        servicesMap[item.service_name].count += item.quantity
        servicesMap[item.service_name].amount += item.total_amount
      })
      const topServices = Object.entries(servicesMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)

      // Doctor wise revenue
      const doctorWiseMap: Record<string, { patients: number; revenue: number }> = {}
      admissions.forEach(a => {
        const doctorName = a.doctor?.name || 'Unassigned'
        if (!doctorWiseMap[doctorName]) {
          doctorWiseMap[doctorName] = { patients: 0, revenue: 0 }
        }
        doctorWiseMap[doctorName].patients++
      })
      // Add revenue from bills
      bills.forEach(b => {
        const admission = admissions.find(a => a.id === b.admission_id)
        const doctorName = admission?.doctor?.name || 'Unassigned'
        if (doctorWiseMap[doctorName]) {
          doctorWiseMap[doctorName].revenue += b.net_amount
        }
      })
      const doctorWiseRevenue = Object.entries(doctorWiseMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)

      const collectionRate = totalRevenue > 0 ? (totalCollection / totalRevenue) * 100 : 0

      setData({
        totalRevenue,
        totalCollection,
        totalPending,
        totalExpenses,
        netProfit: totalCollection - totalExpenses,
        collectionRate,
        totalAdmissions,
        totalDischarges,
        activeAdmissions,
        averageStay,
        paymentsByMode,
        topServices,
        revenueByType,
        expensesByCategory,
        dailyCollection: [],
        doctorWiseRevenue,
        wardWiseOccupancy: [],
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, isAdmin])

  useEffect(() => {
    if (startDate && endDate) {
      fetchReportData()
    }
  }, [startDate, endDate, fetchReportData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">View detailed reports and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map(preset => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {datePreset === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">From</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">To</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <Button onClick={fetchReportData} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh
              </Button>
            </div>

            <div className="ml-auto text-sm text-gray-500">
              <Calendar className="h-4 w-4 inline mr-1" />
              {formatDate(startDate)} - {formatDate(endDate)}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(data.totalRevenue)}
              icon={<Receipt className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Collection"
              value={formatCurrency(data.totalCollection)}
              icon={<TrendingUp className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              title="Pending"
              value={formatCurrency(data.totalPending)}
              icon={<TrendingDown className="h-6 w-6" />}
              color="yellow"
            />
            {isAdmin && (
              <>
                <StatCard
                  title="Expenses"
                  value={formatCurrency(data.totalExpenses)}
                  icon={<DollarSign className="h-6 w-6" />}
                  color="red"
                />
                <StatCard
                  title="Net Profit"
                  value={formatCurrency(data.netProfit)}
                  icon={data.netProfit >= 0 ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
                  color={data.netProfit >= 0 ? 'green' : 'red'}
                />
              </>
            )}
            <StatCard
              title="Collection Rate"
              value={`${data.collectionRate.toFixed(1)}%`}
              icon={<Activity className="h-6 w-6" />}
              color="purple"
            />
          </div>

          {/* Admissions Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Admissions"
              value={data.totalAdmissions}
              icon={<UserPlus className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Discharges"
              value={data.totalDischarges}
              icon={<Users className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              title="Active Patients"
              value={data.activeAdmissions}
              icon={<BedDouble className="h-6 w-6" />}
              color="yellow"
            />
            <StatCard
              title="Avg Stay (Days)"
              value={data.averageStay.toFixed(1)}
              icon={<Calendar className="h-6 w-6" />}
              color="purple"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="doctors">Doctors</TabsTrigger>
              {isAdmin && <TabsTrigger value="expenses">Expenses</TabsTrigger>}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Revenue by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.revenueByType.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No data available</p>
                      ) : (
                        data.revenueByType.map((item, index) => {
                          const percentage = (item.amount / data.totalRevenue) * 100
                          return (
                            <div key={index}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{item.type}</span>
                                <span>{formatCurrency(item.amount)} ({percentage.toFixed(1)}%)</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Modes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Collection by Payment Mode
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mode</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.paymentsByMode.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                              No payments in this period
                            </TableCell>
                          </TableRow>
                        ) : (
                          data.paymentsByMode.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <Badge variant="outline">{item.mode}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{item.count}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                {formatCurrency(item.amount)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Financial Tab */}
            <TabsContent value="financial">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-700">Income</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                          <span>Total Billed</span>
                          <span className="font-bold">{formatCurrency(data.totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                          <span>Total Collected</span>
                          <span className="font-bold text-green-600">{formatCurrency(data.totalCollection)}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-yellow-50 rounded-lg">
                          <span>Pending Collection</span>
                          <span className="font-bold text-yellow-600">{formatCurrency(data.totalPending)}</span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700">Expenses & Profit</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                            <span>Total Expenses</span>
                            <span className="font-bold text-red-600">{formatCurrency(data.totalExpenses)}</span>
                          </div>
                          <div className={`flex justify-between p-3 rounded-lg ${data.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                            <span>Net Profit/Loss</span>
                            <span className={`font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(data.netProfit)}
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                            <span>Collection Rate</span>
                            <span className="font-bold text-purple-600">{data.collectionRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    Top 10 Services by Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Service Name</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topServices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                            No services billed in this period
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.topServices.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                            <TableCell className="text-right text-gray-500">
                              {data.totalRevenue > 0 ? ((item.amount / data.totalRevenue) * 100).toFixed(1) : 0}%
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Doctors Tab */}
            <TabsContent value="doctors">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Doctor-wise Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Doctor Name</TableHead>
                        <TableHead className="text-right">Patients</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Avg/Patient</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.doctorWiseRevenue.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                            No data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.doctorWiseRevenue.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-medium">Dr. {item.name}</TableCell>
                            <TableCell className="text-right">{item.patients}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.revenue)}</TableCell>
                            <TableCell className="text-right text-gray-500">
                              {formatCurrency(item.patients > 0 ? item.revenue / item.patients : 0)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expenses Tab (Admin Only) */}
            {isAdmin && (
              <TabsContent value="expenses">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Expenses by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.expensesByCategory.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No expenses in this period</p>
                    ) : (
                      <div className="space-y-4">
                        {data.expensesByCategory.map((item, index) => {
                          const percentage = (item.amount / data.totalExpenses) * 100
                          return (
                            <div key={index}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{item.category}</span>
                                <span>{formatCurrency(item.amount)} ({percentage.toFixed(1)}%)</span>
                              </div>
                              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-500 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                        <div className="mt-6 pt-4 border-t">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total Expenses</span>
                            <span className="text-red-600">{formatCurrency(data.totalExpenses)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  )
}
