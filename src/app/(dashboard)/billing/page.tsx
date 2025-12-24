'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { billService } from '@/lib/database'
import { Bill, BillStatus, BillType } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import {
  Receipt,
  Search,
  Filter,
  Eye,
  Printer,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Calendar
} from 'lucide-react'

export default function BillingPage() {
  const { user } = useAuth()
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<BillType | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')

  const isAdmin = user?.role === 'admin'
  const isBilling = user?.role === 'billing'
  const canEdit = isAdmin || isBilling

  useEffect(() => {
    fetchBills()
  }, [])

  async function fetchBills() {
    try {
      const data = await billService.getAll()
      setBills(data)
    } catch (error) {
      console.error('Error fetching bills:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter bills
  const filteredBills = bills.filter(bill => {
    const matchesSearch = searchQuery === '' ||
      bill.bill_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.patient?.registration_number?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter
    const matchesType = typeFilter === 'all' || bill.bill_type === typeFilter

    let matchesDate = true
    if (dateFilter !== 'all') {
      const billDate = new Date(bill.bill_date)
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      if (dateFilter === 'today') {
        matchesDate = billDate >= startOfDay
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date(startOfDay)
        startOfWeek.setDate(startOfWeek.getDate() - 7)
        matchesDate = billDate >= startOfWeek
      } else if (dateFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        matchesDate = billDate >= startOfMonth
      }
    }

    return matchesSearch && matchesStatus && matchesType && matchesDate
  })

  // Stats
  const totalBilled = filteredBills.reduce((sum, b) => sum + b.net_amount, 0)
  const totalReceived = filteredBills.reduce((sum, b) => sum + b.amount_received, 0)
  const totalPending = filteredBills.reduce((sum, b) => sum + (b.net_amount - b.amount_received), 0)
  const paidCount = filteredBills.filter(b => b.status === 'Paid').length
  const partialCount = filteredBills.filter(b => b.status === 'Partial').length
  const draftCount = filteredBills.filter(b => b.status === 'Draft').length

  const getStatusIcon = (status: BillStatus) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'Partial':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'Draft':
        return <AlertCircle className="h-4 w-4 text-gray-600" />
      case 'Cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-500">Manage patient bills and payments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Billed</p>
                <p className="text-xl font-bold">{formatCurrency(totalBilled)}</p>
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
                <p className="text-sm text-gray-500">Total Received</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalReceived)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Pending</p>
                <p className="text-xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
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
                <p className="text-sm text-gray-500">Collection Rate</p>
                <p className="text-xl font-bold">
                  {totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0}%
                </p>
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
                placeholder="Search by bill number, patient name..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BillStatus | 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as BillType | 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="IPD">IPD</SelectItem>
                <SelectItem value="OPD">OPD</SelectItem>
                <SelectItem value="Pathology">Pathology</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
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
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <Badge variant="outline" className="cursor-pointer" onClick={() => setStatusFilter('all')}>
              All ({filteredBills.length})
            </Badge>
            <Badge variant="secondary" className="cursor-pointer bg-green-50 text-green-700" onClick={() => setStatusFilter('Paid')}>
              <CheckCircle className="h-3 w-3 mr-1" />
              Paid ({paidCount})
            </Badge>
            <Badge variant="secondary" className="cursor-pointer bg-yellow-50 text-yellow-700" onClick={() => setStatusFilter('Partial')}>
              <Clock className="h-3 w-3 mr-1" />
              Partial ({partialCount})
            </Badge>
            <Badge variant="secondary" className="cursor-pointer bg-gray-50 text-gray-700" onClick={() => setStatusFilter('Draft')}>
              <AlertCircle className="h-3 w-3 mr-1" />
              Draft ({draftCount})
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
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
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No bills found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBills.map((bill) => {
                  const pending = bill.net_amount - bill.amount_received
                  return (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.bill_number}</TableCell>
                      <TableCell className="text-gray-500">{formatDate(bill.bill_date)}</TableCell>
                      <TableCell>
                        {bill.patient && (
                          <Link href={`/patients/${bill.patient_id}`} className="flex items-center gap-2 hover:text-blue-600">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                              {getInitials(bill.patient.name)}
                            </div>
                            <div>
                              <p className="font-medium">{bill.patient.name}</p>
                              <p className="text-xs text-gray-500">{bill.patient.registration_number}</p>
                            </div>
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{bill.bill_type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(bill.net_amount)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(bill.amount_received)}</TableCell>
                      <TableCell className={`text-right font-medium ${pending > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {formatCurrency(pending)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          bill.status === 'Paid' ? 'default' :
                          bill.status === 'Partial' ? 'secondary' :
                          bill.status === 'Cancelled' ? 'destructive' :
                          'outline'
                        }>
                          {getStatusIcon(bill.status)}
                          <span className="ml-1">{bill.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/billing/${bill.admission_id || bill.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {pending > 0 && canEdit && (
                            <Link href={`/billing/${bill.admission_id || bill.id}?payment=true`}>
                              <Button variant="ghost" size="sm" className="text-green-600">
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          <Button variant="ghost" size="sm">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
