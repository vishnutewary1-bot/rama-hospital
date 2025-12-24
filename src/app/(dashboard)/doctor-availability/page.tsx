'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DoctorAvailability, Doctor } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar, Clock, User, Plus, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react'

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function DoctorAvailabilityPage() {
  const [availabilities, setAvailabilities] = useState<DoctorAvailability[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all')
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDoctors()
    fetchAvailabilities()
  }, [selectedDoctor])

  async function fetchDoctors() {
    try {
      const res = await fetch('/api/doctors')
      const data = await res.json()
      if (data.success) {
        setDoctors(data.data?.filter((d: Doctor) => d.is_active) || [])
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
    }
  }

  async function fetchAvailabilities() {
    try {
      const params = new URLSearchParams()
      if (selectedDoctor !== 'all') {
        params.append('doctor_id', selectedDoctor)
      }
      params.append('is_active', 'true')

      const res = await fetch(`/api/doctor-availability?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setAvailabilities(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching availabilities:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setError('')
    try {
      const res = await fetch(`/api/doctor-availability/${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete availability')
      }

      setAvailabilities(availabilities.filter(a => a.id !== id))
      setDeleteDialog(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    setError('')
    try {
      const res = await fetch(`/api/doctor-availability/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update availability')
      }

      setAvailabilities(availabilities.map(a =>
        a.id === id ? { ...a, is_active: !currentStatus } : a
      ))
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Group availabilities by doctor
  const availabilitiesByDoctor = availabilities.reduce((acc, avail) => {
    const doctorId = avail.doctor_id
    if (!acc[doctorId]) {
      acc[doctorId] = []
    }
    acc[doctorId].push(avail)
    return acc
  }, {} as Record<string, DoctorAvailability[]>)

  if (loading) {
    return <div className="text-center py-8">Loading doctor availability...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Doctor Availability</h1>
          <p className="text-sm text-gray-600 mt-1">Manage doctor schedules and availability</p>
        </div>
        <Link href="/doctor-availability/new">
          <Button size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Availability
          </Button>
        </Link>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="max-w-xs">
          <label className="text-sm font-medium mb-2 block">Filter by Doctor</label>
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
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Availabilities by Doctor */}
      <div className="space-y-6">
        {Object.keys(availabilitiesByDoctor).length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No availability schedules found</p>
            <Link href="/doctor-availability/new">
              <Button className="mt-4">Add First Schedule</Button>
            </Link>
          </Card>
        ) : (
          Object.entries(availabilitiesByDoctor).map(([doctorId, schedules]) => {
            const doctor = schedules[0]?.doctor
            if (!doctor) return null

            // Sort schedules by day of week
            const sortedSchedules = [...schedules].sort((a, b) => a.day_of_week - b.day_of_week)

            return (
              <Card key={doctorId}>
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{doctor.name}</h3>
                      <p className="text-sm text-gray-600">{doctor.specialization}</p>
                    </div>
                    <Badge variant="secondary">
                      {schedules.filter(s => s.is_active).length} active schedule(s)
                    </Badge>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Slot Duration</TableHead>
                      <TableHead>Max Patients/Slot</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">
                          {schedule.day_name || daysOfWeek[schedule.day_of_week]}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{schedule.start_time} - {schedule.end_time}</span>
                          </div>
                        </TableCell>
                        <TableCell>{schedule.slot_duration_minutes} min</TableCell>
                        <TableCell>{schedule.max_patients_per_slot}</TableCell>
                        <TableCell>
                          <Badge variant={schedule.is_active ? 'default' : 'outline'}>
                            {schedule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={schedule.is_active ? 'outline' : 'default'}
                              onClick={() => toggleActive(schedule.id, schedule.is_active)}
                            >
                              {schedule.is_active ? 'Deactivate' : 'Activate'}
                            </Button>

                            <Dialog
                              open={deleteDialog === schedule.id}
                              onOpenChange={(open) => setDeleteDialog(open ? schedule.id : null)}
                            >
                              <DialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete Availability Schedule</DialogTitle>
                                </DialogHeader>
                                <p className="text-gray-600">
                                  Are you sure you want to delete this availability schedule for{' '}
                                  <strong>{schedule.day_name || daysOfWeek[schedule.day_of_week]}</strong>?
                                  This action cannot be undone.
                                </p>
                                <div className="flex justify-end gap-2 mt-4">
                                  <Button
                                    variant="outline"
                                    onClick={() => setDeleteDialog(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleDelete(schedule.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )
          })
        )}
      </div>

      {/* Weekly Calendar View */}
      {selectedDoctor !== 'all' && availabilities.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Weekly Schedule</h3>
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map((day, index) => {
              const daySchedules = availabilities.filter(
                a => a.day_of_week === index && a.is_active
              )

              return (
                <div key={day} className="border rounded-lg p-3">
                  <div className="font-semibold text-sm mb-2 text-center">{day}</div>
                  {daySchedules.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-2">No schedule</div>
                  ) : (
                    <div className="space-y-2">
                      {daySchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="bg-blue-50 border border-blue-200 rounded p-2 text-xs"
                        >
                          <div className="font-medium text-blue-900">
                            {schedule.start_time}
                          </div>
                          <div className="text-blue-700">
                            to {schedule.end_time}
                          </div>
                          <div className="text-blue-600 mt-1">
                            {schedule.slot_duration_minutes}m slots
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
