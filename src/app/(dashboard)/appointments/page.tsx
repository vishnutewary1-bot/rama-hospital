'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Appointment, Doctor } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Clock, User, Stethoscope, Filter, CalendarDays, List, Plus, Search } from 'lucide-react'

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    fetchDoctors()
    fetchAppointments()
  }, [selectedDoctor, selectedStatus, selectedDate])

  async function fetchDoctors() {
    try {
      const res = await fetch('/api/doctors')
      const data = await res.json()
      if (data.success) {
        setDoctors(data.data.filter((d: Doctor) => d.is_active))
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
    }
  }

  async function fetchAppointments() {
    try {
      const params = new URLSearchParams()
      if (selectedDoctor !== 'all') params.append('doctor_id', selectedDoctor)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      if (selectedDate) params.append('date', selectedDate)

      const res = await fetch(`/api/appointments?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setAppointments(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAppointments = appointments.filter(apt =>
    apt.appointment_number.toLowerCase().includes(search.toLowerCase()) ||
    apt.patient?.name.toLowerCase().includes(search.toLowerCase()) ||
    apt.doctor?.name.toLowerCase().includes(search.toLowerCase()) ||
    apt.reason.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'default'
      case 'Scheduled': return 'secondary'
      case 'Completed': return 'default'
      case 'Cancelled': return 'destructive'
      case 'No-show': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-500'
      case 'Scheduled': return 'bg-blue-500'
      case 'Completed': return 'bg-gray-500'
      case 'Cancelled': return 'bg-red-500'
      case 'No-show': return 'bg-yellow-500'
      default: return 'bg-gray-300'
    }
  }

  // Group appointments by time for calendar view
  const appointmentsByTime = filteredAppointments.reduce((acc, apt) => {
    const time = apt.appointment_time
    if (!acc[time]) acc[time] = []
    acc[time].push(apt)
    return acc
  }, {} as Record<string, Appointment[]>)

  const timeSlots = Object.keys(appointmentsByTime).sort()

  if (loading) {
    return <div className="text-center py-8">Loading appointments...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Appointments</h1>
          <p className="text-sm text-gray-600 mt-1">Manage patient appointments and schedules</p>
        </div>
        <Link href="/appointments/new">
          <Button size="lg">
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search appointments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Doctor</label>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger>
                <SelectValue placeholder="All Doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="No-show">No-show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'calendar')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays className="h-4 w-4 mr-2" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Apt. No.</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No appointments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium">{appointment.appointment_number}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(appointment.appointment_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {appointment.appointment_time}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{appointment.patient?.name}</div>
                          <div className="text-xs text-gray-500">
                            {appointment.patient?.age}Y / {appointment.patient?.gender.charAt(0)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{appointment.doctor?.name}</div>
                          <div className="text-xs text-gray-500">{appointment.doctor?.specialization}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{appointment.appointment_type}</span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{appointment.reason}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/appointments/${appointment.id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <Card className="p-6">
            <div className="space-y-4">
              {timeSlots.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No appointments scheduled for this date
                </div>
              ) : (
                timeSlots.map((time) => (
                  <div key={time} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-lg">{time}</span>
                      <Badge variant="secondary">{appointmentsByTime[time].length} appointment(s)</Badge>
                    </div>
                    <div className="space-y-2 mt-2">
                      {appointmentsByTime[time].map((appointment) => (
                        <div
                          key={appointment.id}
                          className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${getStatusColor(appointment.status)}`} />
                                <span className="font-medium">{appointment.patient?.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {appointment.appointment_type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Stethoscope className="h-3 w-3" />
                                  {appointment.doctor?.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {appointment.patient?.age}Y / {appointment.patient?.gender}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{appointment.reason}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant={getStatusBadgeVariant(appointment.status)}>
                                {appointment.status}
                              </Badge>
                              <Link href={`/appointments/${appointment.id}`}>
                                <Button size="sm" variant="outline">View</Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold">{filteredAppointments.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Scheduled</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredAppointments.filter(a => a.status === 'Scheduled').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Confirmed</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredAppointments.filter(a => a.status === 'Confirmed').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Completed</div>
          <div className="text-2xl font-bold text-gray-600">
            {filteredAppointments.filter(a => a.status === 'Completed').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Cancelled</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredAppointments.filter(a => a.status === 'Cancelled').length}
          </div>
        </Card>
      </div>
    </div>
  )
}
