'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { Clock, Users, Calendar, Search, Filter } from 'lucide-react'

interface OPDRegistration {
  id: string
  registration_number: string
  token_number: string
  visit_date: string
  visit_type: 'New' | 'Follow-up' | 'Emergency'
  visit_reason: string
  status: 'Waiting' | 'In-Consultation' | 'Completed' | 'Cancelled'
  consultation_fee: number
  payment_status: 'Paid' | 'Pending'
  checked_in_at: string
  patient?: {
    id: string
    name: string
    age: number
    gender: string
    mobile: string
    registration_number: string
  }
  doctor?: {
    id: string
    name: string
    specialization: string
  }
}

export default function OPDRegistrationsPage() {
  const [registrations, setRegistrations] = useState<OPDRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [visitTypeFilter, setVisitTypeFilter] = useState('')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [stats, setStats] = useState({
    total: 0,
    waiting: 0,
    inConsultation: 0,
    completed: 0
  })

  useEffect(() => {
    fetchRegistrations()
  }, [statusFilter, visitTypeFilter, dateFilter])

  async function fetchRegistrations() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (visitTypeFilter) params.append('visit_type', visitTypeFilter)
      if (dateFilter) params.append('visit_date', dateFilter)

      const response = await fetch(`/api/opd/registrations?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setRegistrations(result.data || [])
        calculateStats(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching OPD registrations:', error)
    } finally {
      setLoading(false)
    }
  }

  function calculateStats(data: OPDRegistration[]) {
    setStats({
      total: data.length,
      waiting: data.filter(r => r.status === 'Waiting').length,
      inConsultation: data.filter(r => r.status === 'In-Consultation').length,
      completed: data.filter(r => r.status === 'Completed').length,
    })
  }

  const filteredRegistrations = registrations.filter(r =>
    r.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.registration_number.toLowerCase().includes(search.toLowerCase()) ||
    r.token_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.patient?.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.patient?.mobile?.includes(search)
  )

  if (loading) {
    return <div className="text-center py-8">Loading OPD registrations...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">OPD Registrations</h1>
          <p className="text-gray-500 mt-1">Manage outpatient department registrations and queue</p>
        </div>
        <Link href="/opd/registrations/new">
          <Button size="lg">+ New OPD Registration</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Today</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Waiting</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.waiting}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">In Consultation</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{stats.inConsultation}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{stats.completed}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by patient name, registration number, token, mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="w-full md:w-48">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            <div className="w-full md:w-48">
              <Select value={visitTypeFilter} onValueChange={setVisitTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Visit Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="Waiting">Waiting</SelectItem>
                  <SelectItem value="In-Consultation">In Consultation</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Reg. No.</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Visit Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Check-in Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRegistrations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                  No registrations found
                </TableCell>
              </TableRow>
            ) : (
              filteredRegistrations.map((registration) => (
                <TableRow key={registration.id}>
                  <TableCell>
                    <span className="font-bold text-lg text-blue-600">
                      {registration.token_number || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {registration.registration_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{registration.patient?.name}</p>
                      <p className="text-sm text-gray-500">
                        {registration.patient?.age}Y / {registration.patient?.gender.charAt(0)} • {registration.patient?.mobile}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">Dr. {registration.doctor?.name}</p>
                      <p className="text-sm text-gray-500">{registration.doctor?.specialization}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      registration.visit_type === 'Emergency'
                        ? 'bg-red-100 text-red-700'
                        : registration.visit_type === 'Follow-up'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {registration.visit_type}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {registration.visit_reason}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{formatDate(registration.checked_in_at, 'time')}</p>
                      <p className="text-xs text-gray-500">{formatRelativeTime(registration.checked_in_at)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium text-center ${
                        registration.status === 'Completed'
                          ? 'bg-green-100 text-green-700'
                          : registration.status === 'In-Consultation'
                          ? 'bg-purple-100 text-purple-700'
                          : registration.status === 'Waiting'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {registration.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium text-center ${
                        registration.payment_status === 'Paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {registration.payment_status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {registration.status === 'Waiting' && (
                        <Link href={`/opd/consultations/new?opd_id=${registration.id}`}>
                          <Button size="sm" variant="default">Start</Button>
                        </Link>
                      )}
                      {registration.status === 'Completed' && (
                        <Link href={`/opd/consultations?opd_id=${registration.id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      )}
                    </div>
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
