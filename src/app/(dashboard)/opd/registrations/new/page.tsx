'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { opdRegistrationSchema } from '@/lib/validations'
import type { OPDRegistrationInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, getInitials } from '@/lib/utils'
import {
  Search,
  User,
  Stethoscope,
  Calendar,
  DollarSign,
  CreditCard,
  Phone,
  AlertCircle,
  Loader2,
} from 'lucide-react'

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  mobile: string
  registration_number: string
  blood_group?: string
  allergies?: string
  medical_alerts?: string
}

interface Doctor {
  id: string
  name: string
  specialization: string
  consultation_fee: number
  follow_up_fee: number
}

export default function NewOPDRegistrationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientIdParam = searchParams.get('patient')

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [showPatientSearch, setShowPatientSearch] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<OPDRegistrationInput>({
    resolver: zodResolver(opdRegistrationSchema),
    defaultValues: {
      patient_id: patientIdParam || '',
      doctor_id: '',
      visit_date: new Date().toISOString().split('T')[0],
      visit_type: 'New',
      visit_reason: '',
      consultation_fee: 0,
      payment_mode: 'Cash',
      payment_status: 'Pending',
    },
  })

  const watchedValues = watch()

  const fetchInitialData = useCallback(async () => {
    setLoading(true)
    try {
      const doctorsRes = await fetch('/api/doctors?is_active=true')
      const doctorsData = await doctorsRes.json()
      setDoctors(doctorsData.data || [])

      if (patientIdParam) {
        const patientRes = await fetch(`/api/patients/${patientIdParam}`)
        const patientData = await patientRes.json()
        if (patientData.data) {
          setSelectedPatient(patientData.data)
          setValue('patient_id', patientIdParam)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [patientIdParam, setValue])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  async function searchPatients(query: string) {
    if (query.length < 2) {
      setPatients([])
      return
    }
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(query)}`)
      const data = await res.json()
      setPatients(data.data || [])
    } catch (error) {
      console.error('Error searching patients:', error)
    }
  }

  function selectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setValue('patient_id', patient.id)
    setShowPatientSearch(false)
    setPatientSearch('')
    setPatients([])
  }

  function selectDoctor(doctorId: string) {
    const doctor = doctors.find(d => d.id === doctorId)
    setSelectedDoctor(doctor || null)
    setValue('doctor_id', doctorId)

    if (doctor) {
      const fee = watchedValues.visit_type === 'Follow-up'
        ? doctor.follow_up_fee
        : doctor.consultation_fee
      setValue('consultation_fee', fee)
    }
  }

  useEffect(() => {
    if (selectedDoctor) {
      const fee = watchedValues.visit_type === 'Follow-up'
        ? selectedDoctor.follow_up_fee
        : selectedDoctor.consultation_fee
      setValue('consultation_fee', fee)
    }
  }, [watchedValues.visit_type, selectedDoctor, setValue])

  async function onSubmit(data: OPDRegistrationInput) {
    setSubmitting(true)

    try {
      const response = await fetch('/api/opd/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create OPD registration')
      }

      const result = await response.json()
      router.push('/opd/registrations')
    } catch (error) {
      console.error('Error creating OPD registration:', error)
      alert('Failed to create OPD registration. Please try again.')
    } finally {
      setSubmitting(false)
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New OPD Registration</h1>
        <p className="text-gray-500 mt-1">Register a patient for outpatient consultation</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPatient ? (
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                    {getInitials(selectedPatient.name)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{selectedPatient.name}</h3>
                    <p className="text-gray-600">
                      {selectedPatient.registration_number} • {selectedPatient.age} years • {selectedPatient.gender}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedPatient.mobile}
                      </span>
                      {selectedPatient.blood_group && (
                        <span className="text-red-600 font-medium">{selectedPatient.blood_group}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedPatient(null)
                      setValue('patient_id', '')
                    }}
                  >
                    Change
                  </Button>
                </div>
                {(selectedPatient.medical_alerts || selectedPatient.allergies) && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="text-sm">
                        {selectedPatient.medical_alerts && (
                          <p className="text-red-700"><strong>Alerts:</strong> {selectedPatient.medical_alerts}</p>
                        )}
                        {selectedPatient.allergies && (
                          <p className="text-red-700"><strong>Allergies:</strong> {selectedPatient.allergies}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, mobile, or registration number..."
                    className="pl-10"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      searchPatients(e.target.value)
                    }}
                    onFocus={() => setShowPatientSearch(true)}
                  />
                </div>

                {showPatientSearch && patients.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {patients.map((patient) => (
                      <button
                        type="button"
                        key={patient.id}
                        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left"
                        onClick={() => selectPatient(patient)}
                      >
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                          {getInitials(patient.name)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-sm text-gray-500">
                            {patient.registration_number} • {patient.age}Y • {patient.gender} • {patient.mobile}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {patientSearch.length >= 2 && patients.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No patients found</p>
                )}
              </div>
            )}
            {errors.patient_id && (
              <p className="text-sm text-red-600">{errors.patient_id.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Doctor & Visit Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Consultation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Doctor *</label>
              <Select
                value={watchedValues.doctor_id}
                onValueChange={selectDoctor}
              >
                <SelectTrigger error={errors.doctor_id?.message}>
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.name} - {doctor.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.doctor_id && (
                <p className="text-sm text-red-600 mt-1">{errors.doctor_id.message}</p>
              )}
            </div>

            {selectedDoctor && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-blue-700">Consultation Fee</p>
                    <p className="text-xl font-bold text-blue-900">{formatCurrency(selectedDoctor.consultation_fee)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">Follow-up Fee</p>
                    <p className="text-xl font-bold text-blue-900">{formatCurrency(selectedDoctor.follow_up_fee)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Visit Date *</label>
                <Input
                  type="date"
                  {...register('visit_date')}
                  error={errors.visit_date?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Visit Type *</label>
                <Select
                  value={watchedValues.visit_type}
                  onValueChange={(value: 'New' | 'Follow-up' | 'Emergency') => setValue('visit_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New Visit</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reason for Visit *</label>
              <textarea
                {...register('visit_reason')}
                className="w-full p-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter the reason for visit..."
              />
              {errors.visit_reason && (
                <p className="text-sm text-red-600 mt-1">{errors.visit_reason.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Referred By</label>
              <Input
                {...register('referred_by')}
                placeholder="Doctor/Person who referred"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Consultation Fee *</label>
                <Input
                  type="number"
                  {...register('consultation_fee', { valueAsNumber: true })}
                  error={errors.consultation_fee?.message}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Payment Status *</label>
                <Select
                  value={watchedValues.payment_status}
                  onValueChange={(value: 'Paid' | 'Pending') => setValue('payment_status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {watchedValues.payment_status === 'Paid' && (
              <div>
                <label className="block text-sm font-medium mb-2">Payment Mode</label>
                <Select
                  value={watchedValues.payment_mode}
                  onValueChange={(value) => setValue('payment_mode', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700 font-medium">Total Amount:</span>
                <span className="text-2xl font-bold text-green-900">
                  {formatCurrency(watchedValues.consultation_fee || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              'Register Patient'
            )}
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
