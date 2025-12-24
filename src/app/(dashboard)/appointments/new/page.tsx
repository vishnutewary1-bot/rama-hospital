'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Patient, Doctor } from '@/types/database'
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
import { Calendar, Clock, User, Stethoscope, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface TimeSlot {
  time: string
  isAvailable: boolean
  bookedCount: number
  maxPatients: number
}

interface AvailableSlotsData {
  date: string
  doctorId: string
  doctor?: Doctor
  isAvailable: boolean
  isOnLeave: boolean
  leaveReason?: string
  totalSlots: number
  availableSlots: number
  bookedSlots: number
  slots: TimeSlot[]
}

export default function NewAppointmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientIdParam = searchParams.get('patient')

  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [availableSlots, setAvailableSlots] = useState<AvailableSlotsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [searchPatient, setSearchPatient] = useState('')

  const [formData, setFormData] = useState({
    patient_id: patientIdParam || '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    appointment_type: 'Consultation',
    duration_minutes: 15,
    reason: '',
    notes: '',
    status: 'Scheduled',
  })

  useEffect(() => {
    fetchPatients()
    fetchDoctors()
  }, [])

  useEffect(() => {
    if (formData.doctor_id && formData.appointment_date) {
      fetchAvailableSlots()
    } else {
      setAvailableSlots(null)
    }
  }, [formData.doctor_id, formData.appointment_date])

  async function fetchPatients() {
    try {
      const res = await fetch('/api/patients')
      const data = await res.json()
      if (data.success) {
        setPatients(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching patients:', error)
    }
  }

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

  async function fetchAvailableSlots() {
    setLoadingSlots(true)
    setError('')
    try {
      const res = await fetch(
        `/api/appointments/available-slots?doctor_id=${formData.doctor_id}&date=${formData.appointment_date}`
      )
      const data = await res.json()

      if (data.success) {
        setAvailableSlots(data.data)
      } else {
        setError(data.error || 'Failed to fetch available slots')
        setAvailableSlots(null)
      }
    } catch (error) {
      console.error('Error fetching slots:', error)
      setError('Failed to fetch available slots')
      setAvailableSlots(null)
    } finally {
      setLoadingSlots(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create appointment')
      }

      router.push(`/appointments/${data.data.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const selectedPatient = patients.find(p => p.id === formData.patient_id)
  const selectedDoctor = doctors.find(d => d.id === formData.doctor_id)

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchPatient.toLowerCase()) ||
    p.registration_number.toLowerCase().includes(searchPatient.toLowerCase()) ||
    p.mobile.includes(searchPatient)
  )

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Book New Appointment</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search Patient *</label>
              <Input
                placeholder="Search by name, registration number, or mobile..."
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
                className="mb-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Select Patient *</label>
              <Select
                value={formData.patient_id}
                onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredPatients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} - {patient.registration_number} ({patient.age}Y/{patient.gender.charAt(0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPatient && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{selectedPatient.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Age/Gender:</span>
                    <span className="ml-2 font-medium">{selectedPatient.age}Y / {selectedPatient.gender}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Mobile:</span>
                    <span className="ml-2 font-medium">{selectedPatient.mobile}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Reg. No:</span>
                    <span className="ml-2 font-medium">{selectedPatient.registration_number}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Doctor & Date Selection */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Doctor & Schedule
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Doctor *</label>
              <Select
                value={formData.doctor_id}
                onValueChange={(value) => {
                  setFormData({ ...formData, doctor_id: value, appointment_time: '' })
                  setAvailableSlots(null)
                }}
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

            <div>
              <label className="block text-sm font-medium mb-2">Appointment Date *</label>
              <Input
                type="date"
                min={today}
                value={formData.appointment_date}
                onChange={(e) => {
                  setFormData({ ...formData, appointment_date: e.target.value, appointment_time: '' })
                  setAvailableSlots(null)
                }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Appointment Type *</label>
              <Select
                value={formData.appointment_type}
                onValueChange={(value) => setFormData({ ...formData, appointment_type: value })}
                required
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
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          {selectedDoctor && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{selectedDoctor.name}</div>
                  <div className="text-sm text-gray-600">{selectedDoctor.specialization}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Consultation Fee</div>
                  <div className="text-lg font-semibold text-green-600">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(selectedDoctor.consultation_fee)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Time Slot Selection */}
        {formData.doctor_id && formData.appointment_date && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Available Time Slots
            </h2>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Loading available slots...</span>
              </div>
            ) : availableSlots?.isOnLeave ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                <p className="text-lg font-medium text-yellow-800">Doctor is on leave</p>
                <p className="text-sm text-yellow-700 mt-1">{availableSlots.leaveReason}</p>
              </div>
            ) : !availableSlots?.isAvailable ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-lg font-medium text-gray-700">Doctor is not available on this day</p>
                <p className="text-sm text-gray-600 mt-1">Please select another date</p>
              </div>
            ) : availableSlots.slots.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-lg font-medium text-gray-700">No slots available</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-green-500 rounded"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-red-500 rounded"></div>
                      <span>Booked</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {availableSlots.availableSlots} of {availableSlots.totalSlots} slots available
                  </div>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {availableSlots.slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.isAvailable}
                      onClick={() => setFormData({ ...formData, appointment_time: slot.time })}
                      className={`
                        relative p-3 rounded-lg border-2 transition-all
                        ${formData.appointment_time === slot.time
                          ? 'border-blue-500 bg-blue-50'
                          : slot.isAvailable
                          ? 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                        }
                      `}
                    >
                      <div className="text-center">
                        <div className="font-semibold">{slot.time}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {slot.bookedCount}/{slot.maxPatients}
                        </div>
                      </div>
                      {formData.appointment_time === slot.time && (
                        <CheckCircle className="absolute top-1 right-1 h-4 w-4 text-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Appointment Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointment Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Reason for Visit *</label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Describe the reason for this appointment..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Additional Notes</label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="Any additional notes or special instructions..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Initial Status</label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            size="lg"
            loading={loading}
            disabled={!formData.patient_id || !formData.doctor_id || !formData.appointment_date || !formData.appointment_time || !formData.reason}
          >
            Book Appointment
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
    </div>
  )
}
