'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Appointment } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Ban,
  CalendarCheck
} from 'lucide-react'

export default function AppointmentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  const [editFormData, setEditFormData] = useState({
    appointment_date: '',
    appointment_time: '',
    appointment_type: '',
    reason: '',
    notes: '',
    duration_minutes: 15,
  })

  useEffect(() => {
    if (params.id) {
      fetchAppointment()
    }
  }, [params.id])

  async function fetchAppointment() {
    try {
      const res = await fetch(`/api/appointments/${params.id}`)
      const data = await res.json()

      if (data.success) {
        setAppointment(data.data)
        setEditFormData({
          appointment_date: data.data.appointment_date,
          appointment_time: data.data.appointment_time,
          appointment_type: data.data.appointment_type,
          reason: data.data.reason,
          notes: data.data.notes || '',
          duration_minutes: data.data.duration_minutes,
        })
      }
    } catch (error) {
      console.error('Error fetching appointment:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate() {
    setError('')
    setUpdating(true)

    try {
      const res = await fetch(`/api/appointments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update appointment')
      }

      setAppointment(data.data)
      setEditing(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  async function handleConfirm() {
    setError('')
    setUpdating(true)

    try {
      const res = await fetch(`/api/appointments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Confirmed' }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm appointment')
      }

      setAppointment(data.data)
      setConfirmDialog(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) {
      setError('Please provide a cancellation reason')
      return
    }

    setError('')
    setUpdating(true)

    try {
      const res = await fetch(`/api/appointments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Cancelled',
          cancellation_reason: cancelReason,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel appointment')
      }

      setAppointment(data.data)
      setCancelDialog(false)
      setCancelReason('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  async function handleComplete() {
    setError('')
    setUpdating(true)

    try {
      const res = await fetch(`/api/appointments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete appointment')
      }

      setAppointment(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/appointments/${params.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete appointment')
      }

      router.push('/appointments')
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 text-lg">Appointment not found</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

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

  const canEdit = ['Scheduled', 'Confirmed'].includes(appointment.status)
  const canConfirm = appointment.status === 'Scheduled'
  const canCancel = ['Scheduled', 'Confirmed'].includes(appointment.status)
  const canComplete = ['Scheduled', 'Confirmed'].includes(appointment.status)
  const canDelete = appointment.status !== 'Completed'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Appointment Details</h1>
              <Badge variant={getStatusBadgeVariant(appointment.status)}>
                {appointment.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">{appointment.appointment_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canConfirm && (
            <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
              <DialogTrigger asChild>
                <Button variant="default">
                  <CalendarCheck className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Appointment</DialogTitle>
                </DialogHeader>
                <p className="text-gray-600">Are you sure you want to confirm this appointment?</p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setConfirmDialog(false)}>Cancel</Button>
                  <Button onClick={handleConfirm} loading={updating}>Confirm Appointment</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {canEdit && !editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}

          {canCancel && (
            <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel Appointment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-gray-600">Please provide a reason for cancellation:</p>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Cancellation reason..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCancelDialog(false)}>Close</Button>
                    <Button variant="destructive" onClick={handleCancel} loading={updating}>
                      Cancel Appointment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {editing ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Edit Appointment</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Appointment Date</label>
                <Input
                  type="date"
                  value={editFormData.appointment_date}
                  onChange={(e) => setEditFormData({ ...editFormData, appointment_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Appointment Time</label>
                <Input
                  type="time"
                  value={editFormData.appointment_time}
                  onChange={(e) => setEditFormData({ ...editFormData, appointment_time: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <Select
                  value={editFormData.appointment_type}
                  onValueChange={(value) => setEditFormData({ ...editFormData, appointment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="Procedure">Procedure</SelectItem>
                    <SelectItem value="Check-up">Check-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                <Input
                  type="number"
                  min="5"
                  max="180"
                  value={editFormData.duration_minutes}
                  onChange={(e) => setEditFormData({ ...editFormData, duration_minutes: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reason</label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                value={editFormData.reason}
                onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUpdate} loading={updating}>Save Changes</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Appointment Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Schedule Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Appointment Date</dt>
                    <dd className="font-medium">
                      {new Date(appointment.appointment_date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Time</dt>
                    <dd className="font-medium">{appointment.appointment_time}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Type</dt>
                    <dd className="font-medium">{appointment.appointment_type}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Duration</dt>
                    <dd className="font-medium">{appointment.duration_minutes} minutes</dd>
                  </div>
                  {appointment.confirmed_at && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Confirmed At</dt>
                      <dd className="font-medium text-green-600">
                        {new Date(appointment.confirmed_at).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Patient Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Name</dt>
                    <dd className="font-medium">
                      <Link href={`/patients/${appointment.patient?.id}`} className="text-blue-600 hover:underline">
                        {appointment.patient?.name}
                      </Link>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Age/Gender</dt>
                    <dd className="font-medium">
                      {appointment.patient?.age} years / {appointment.patient?.gender}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Mobile</dt>
                    <dd className="font-medium">
                      <a href={`tel:${appointment.patient?.mobile}`} className="text-blue-600 hover:underline">
                        {appointment.patient?.mobile}
                      </a>
                    </dd>
                  </div>
                  {appointment.patient?.email && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Email</dt>
                      <dd className="font-medium">
                        <a href={`mailto:${appointment.patient?.email}`} className="text-blue-600 hover:underline">
                          {appointment.patient.email}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Doctor Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Doctor Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Name</dt>
                    <dd className="font-medium">{appointment.doctor?.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Specialization</dt>
                    <dd className="font-medium">{appointment.doctor?.specialization}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Consultation Fee</dt>
                    <dd className="font-medium">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(appointment.doctor?.consultation_fee || 0)}
                    </dd>
                  </div>
                  {appointment.doctor?.phone && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Phone</dt>
                      <dd className="font-medium">{appointment.doctor.phone}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Appointment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-gray-500 mb-1">Reason for Visit</dt>
                    <dd className="font-medium">{appointment.reason}</dd>
                  </div>
                  {appointment.notes && (
                    <div>
                      <dt className="text-gray-500 mb-1">Additional Notes</dt>
                      <dd className="text-sm">{appointment.notes}</dd>
                    </div>
                  )}
                  {appointment.status === 'Cancelled' && appointment.cancellation_reason && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <dt className="text-red-700 font-medium mb-1">Cancellation Reason</dt>
                      <dd className="text-sm text-red-600">{appointment.cancellation_reason}</dd>
                      {appointment.cancelled_at && (
                        <dd className="text-xs text-red-500 mt-1">
                          Cancelled on {new Date(appointment.cancelled_at).toLocaleString()}
                        </dd>
                      )}
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          {canComplete && appointment.status !== 'Completed' && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Mark as Completed</h3>
                  <p className="text-sm text-gray-600">Mark this appointment as completed after the consultation</p>
                </div>
                <Button onClick={handleComplete} loading={updating}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              </div>
            </Card>
          )}

          {canDelete && (
            <Card className="p-6 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-red-600">Delete Appointment</h3>
                  <p className="text-sm text-gray-600">Permanently delete this appointment. This action cannot be undone.</p>
                </div>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
