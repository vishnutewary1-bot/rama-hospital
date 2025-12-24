'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Doctor } from '@/types/database'
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
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, AlertCircle, CheckCircle, Info } from 'lucide-react'

const daysOfWeek = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' },
]

export default function NewDoctorAvailabilityPage() {
  const router = useRouter()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    doctor_id: '',
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 15,
    max_patients_per_slot: 1,
    is_active: true,
  })

  useEffect(() => {
    fetchDoctors()
  }, [])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    // Validation
    if (formData.start_time >= formData.end_time) {
      setError('End time must be after start time')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/doctor-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create availability schedule')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/doctor-availability')
      }, 1500)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const selectedDoctor = doctors.find(d => d.id === formData.doctor_id)

  // Calculate total slots
  const calculateTotalSlots = () => {
    if (!formData.start_time || !formData.end_time || !formData.slot_duration_minutes) {
      return 0
    }

    const [startHour, startMin] = formData.start_time.split(':').map(Number)
    const [endHour, endMin] = formData.end_time.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    const totalMinutes = endMinutes - startMinutes

    if (totalMinutes <= 0) return 0

    return Math.floor(totalMinutes / formData.slot_duration_minutes)
  }

  const totalSlots = calculateTotalSlots()
  const totalCapacity = totalSlots * formData.max_patients_per_slot

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Add Doctor Availability</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Doctor Selection */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Select Doctor
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Doctor *</label>
              <Select
                value={formData.doctor_id}
                onValueChange={(value) => setFormData({ ...formData, doctor_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor..." />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDoctor && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{selectedDoctor.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Specialization:</span>
                    <span className="ml-2 font-medium">{selectedDoctor.specialization}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Consultation Fee:</span>
                    <span className="ml-2 font-medium">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(selectedDoctor.consultation_fee)}
                    </span>
                  </div>
                  {selectedDoctor.opd_days && (
                    <div>
                      <span className="text-gray-600">OPD Days:</span>
                      <span className="ml-2 font-medium">{selectedDoctor.opd_days}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Schedule Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Day of Week *</label>
              <Select
                value={formData.day_of_week}
                onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Time *</label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">End Time *</label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <strong>Total Duration:</strong>{' '}
                  {(() => {
                    const [startHour, startMin] = formData.start_time.split(':').map(Number)
                    const [endHour, endMin] = formData.end_time.split(':').map(Number)
                    const startMinutes = startHour * 60 + startMin
                    const endMinutes = endHour * 60 + endMin
                    const totalMinutes = endMinutes - startMinutes
                    const hours = Math.floor(totalMinutes / 60)
                    const mins = totalMinutes % 60
                    return totalMinutes > 0 ? `${hours}h ${mins}m` : '0h 0m'
                  })()}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Slot Configuration */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Slot Configuration
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Slot Duration (minutes) *</label>
              <Select
                value={formData.slot_duration_minutes.toString()}
                onValueChange={(value) => setFormData({ ...formData, slot_duration_minutes: parseInt(value) })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Maximum Patients per Slot *</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={formData.max_patients_per_slot}
                onChange={(e) => setFormData({ ...formData, max_patients_per_slot: parseInt(e.target.value) })}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of patients that can book the same time slot
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">Schedule Summary</h4>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-700">Total Slots:</span>
                  <span className="ml-2 font-semibold text-blue-900">{totalSlots}</span>
                </div>
                <div>
                  <span className="text-blue-700">Total Capacity:</span>
                  <span className="ml-2 font-semibold text-blue-900">{totalCapacity} patients</span>
                </div>
                <div className="col-span-2">
                  <span className="text-blue-700">Schedule:</span>
                  <span className="ml-2 font-semibold text-blue-900">
                    {formData.day_of_week}, {formData.start_time} - {formData.end_time}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Activate this schedule immediately
              </label>
            </div>
          </div>
        </Card>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Availability schedule created successfully! Redirecting...</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            size="lg"
            loading={loading}
            disabled={!formData.doctor_id || totalSlots === 0}
          >
            Create Availability Schedule
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

      {/* Help Info */}
      <Card className="p-6 mt-6 bg-gray-50">
        <h3 className="font-semibold mb-3">Tips for Setting Up Availability</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>
              Create separate schedules for different days if the doctor has varying availability
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>
              Slot duration should match typical consultation time (15-30 minutes is common)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>
              Set max patients per slot to 1 for exclusive appointments, or higher for walk-in clinics
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>
              You can deactivate schedules temporarily without deleting them
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>
              The system will automatically prevent double-booking based on these settings
            </span>
          </li>
        </ul>
      </Card>
    </div>
  )
}
