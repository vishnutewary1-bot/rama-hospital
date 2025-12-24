'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  ShoppingCart,
  Search,
  Plus,
  Eye,
  Printer,
  TrendingUp,
  DollarSign,
  Package,
  Loader2,
  Calendar,
  User
} from 'lucide-react'

interface Sale {
  id: string
  sale_number: string
  sale_date: string
  patient_id?: string
  patient_name?: string
  patient_mobile?: string
  doctor_id?: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  payment_mode?: string
  notes?: string
  created_at: string
  items?: SaleItem[]
  patient?: { id: string; name: string; registration_number: string }
  doctor?: { id: string; name: string }
}

interface SaleItem {
  id: string
  sale_id: string
  stock_id: string
  medicine_name: string
  batch_number: string
  quantity: number
  unit_price: number
  discount_amount: number
  total_amount: number
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')

  useEffect(() => {
    fetchSales()
  }, [])

  async function fetchSales() {
    try {
      const response = await fetch('/api/pharmacy/sales')
      if (!response.ok) throw new Error('Failed to fetch sales')
      const data = await response.json()
      setSales(data)
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const matchesSearch = searchQuery === '' ||
      sale.sale_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.patient_mobile?.includes(searchQuery)

    let matchesDate = true
    if (dateFilter !== 'all') {
      const saleDate = new Date(sale.sale_date)
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      if (dateFilter === 'today') {
        matchesDate = saleDate >= startOfDay
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date(startOfDay)
        startOfWeek.setDate(startOfWeek.getDate() - 7)
        matchesDate = saleDate >= startOfWeek
      } else if (dateFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        matchesDate = saleDate >= startOfMonth
      }
    }

    const matchesPayment = paymentFilter === 'all' || sale.payment_mode === paymentFilter

    return matchesSearch && matchesDate && matchesPayment
  })

  // Calculate stats
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0)
  const totalCollected = filteredSales.reduce((sum, s) => sum + s.amount_paid, 0)
  const totalDiscount = filteredSales.reduce((sum, s) => sum + s.discount_amount, 0)
  const todaySales = sales.filter(s => {
    const saleDate = new Date(s.sale_date)
    const today = new Date()
    return saleDate.toDateString() === today.toDateString()
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Sales</h1>
          <p className="text-gray-500">Manage medicine dispensing and billing</p>
        </div>
        <Link href="/pharmacy/sales/new">
          <Button size="lg">
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-xl font-bold">{filteredSales.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Collected</p>
                <p className="text-xl font-bold">{formatCurrency(totalCollected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Today's Sales</p>
                <p className="text-xl font-bold">{todaySales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by sale number, patient name..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as typeof dateFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No sales found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.sale_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(sale.sale_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sale.patient_id ? (
                        <Link
                          href={`/patients/${sale.patient_id}`}
                          className="flex items-center gap-2 hover:text-blue-600"
                        >
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{sale.patient?.name || sale.patient_name}</p>
                            {sale.patient?.registration_number && (
                              <p className="text-xs text-gray-500">{sale.patient.registration_number}</p>
                            )}
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{sale.patient_name || 'Walk-in'}</p>
                            {sale.patient_mobile && (
                              <p className="text-xs text-gray-500">{sale.patient_mobile}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(sale.subtotal)}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {sale.discount_amount > 0 ? `-${formatCurrency(sale.discount_amount)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(sale.total_amount)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(sale.amount_paid)}</TableCell>
                    <TableCell>
                      {sale.payment_mode && (
                        <Badge variant="outline">{sale.payment_mode}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Print Invoice">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
