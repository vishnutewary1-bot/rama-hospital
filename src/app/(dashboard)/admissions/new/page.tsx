'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/lib/auth-context'
import { Patient, Doctor, Ward, Bed } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate, getInitials } from '@/lib/utils'
import {
  User,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  BedDouble,
  Heart,
  AlertTriangle,
  Loader2,
  Phone,
  Shield,
  Activity,
} from 'lucide-react'

const admissionSchema = z.object({
  patient_id: z.string().min(1, 'Patient is required'),
  ward_id: z.string().min(1, 'Ward is required'),
  bed_id: z.string().min(1, 'Bed is required'),
  doctor_id: z.string().optional(),
  diagnosis: z.string().optional(),
  chief_complaints: z.string().optional(),
  caretaker_name: z.string().min(1, 'Caretaker name is required'),
  caretaker_mobile: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be 10 digits'),
  caretaker_relation: z.string().optional(),
  is_mlc: z.boolean().default(false),
  mlc_number: z.string().optional(),
  police_station: z.string().optional(),
  brought_by: z.string().optional(),
  has_insurance: z.boolean().default(false),
  insurance_company: z.string().optional(),
  insurance_policy_number: z.string().optional(),
  insurance_amount: z.number().optional(),
  vitals_bp: z.string().optional(),
  vitals_pulse: z.number().optional(),
  vitals_temperature: z.number().optional(),
  vitals_spo2: z.number().optional(),
  vitals_weight: z.number().optional(),
  vitals_height: z.number().optional(),
})

type AdmissionFormData = z.infer<typeof admissionSchema>

const STEPS = [
  { id: 1, title: 'Patient Selection', icon: User },
  { id: 2, title: 'Ward & Bed', icon: BedDouble },
  { id: 3, title: 'Doctor & Diagnosis', icon: Stethoscope },
  { id: 4, title: 'Caretaker Info', icon: Shield },
  { id: 5, title: 'Vitals & Additional', icon: Heart },
]

const RELATIONS = [
  'Spouse', 'Son', 'Daughter', 'Father', 'Mother',
  'Brother', 'Sister', 'Friend', 'Relative', 'Other'
]

export default function NewAdmissionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const patientIdParam = searchParams.get('patient')

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Data
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [beds, setBeds] = useState<Bed[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [showPatientSearch, setShowPatientSearch] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<AdmissionFormData>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      patient_id: patientIdParam || '',
      ward_id: '',
      bed_id: '',
      doctor_id: '',
      diagnosis: '',
      chief_complaints: '',
      caretaker_name: '',
      caretaker_mobile: '',
      caretaker_relation: '',
      is_mlc: false,
      mlc_number: '',
      police_station: '',
      brought_by: '',
      has_insurance: false,
      insurance_company: '',
      insurance_policy_number: '',
      insurance_amount: 0,
      vitals_bp: '',
    },
  })

  const watchedValues = watch()

  const fetchInitialData = useCallback(async () => {
    setLoading(true)
    try {
      const [doctorsRes, wardsRes] = await Promise.all([
        fetch('/api/doctors'),
        fetch('/api/wards'),
      ])

      const doctorsData = await doctorsRes.json()
      const wardsData = await wardsRes.json()

      setDoctors(doctorsData.data?.filter((d: Doctor) => d.is_active) || [])
      setWards(wardsData.data?.filter((w: Ward) => w.is_active) || [])

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

  // Fetch beds when ward changes
  useEffect(() => {
    async function fetchBeds() {
      if (watchedValues.ward_id) {
        try {
          const res = await fetch(`/api/beds?ward_id=${watchedValues.ward_id}&status=available`)
          const data = await res.json()
          setBeds(data.data || [])
          const ward = wards.find(w => w.id === watchedValues.ward_id)
          setSelectedWard(ward || null)
        } catch (error) {
          console.error('Error fetching beds:', error)
        }
      } else {
        setBeds([])
        setSelectedWard(null)
      }
    }
    fetchBeds()
  }, [watchedValues.ward_id, wards])

  // Search patients
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

  function selectBed(bed: Bed) {
    if (bed.status !== 'available') return
    setValue('bed_id', bed.id)
  }

  async function canProceed(): Promise<boolean> {
    switch (currentStep) {
      case 1:
        return await trigger('patient_id')
      case 2:
        return await trigger(['ward_id', 'bed_id'])
      case 3:
        return true // Doctor and diagnosis are optional
      case 4:
        return await trigger(['caretaker_name', 'caretaker_mobile'])
      case 5:
        return true
      default:
        return false
    }
  }

  async function nextStep() {
    const isValid = await canProceed()
    if (currentStep < STEPS.length && isValid) {
      setCurrentStep(currentStep + 1)
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  async function onSubmit(data: AdmissionFormData) {
    setSubmitting(true)

    try {
      const response = await fetch('/api/admissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          created_by: user?.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create admission')
      }

      const result = await response.json()
      router.push(`/admissions/${result.data.id}`)
    } catch (error) {
      console.error('Error creating admission:', error)
      alert('Failed to create admission. Please try again.')
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Admission</h1>
        <p className="text-gray-500">Complete all steps to admit the patient</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  currentStep === step.id
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : currentStep > step.id
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <div className="ml-3 hidden md:block">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {step.title}
                </p>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`w-12 md:w-24 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Patient Selection */}
            {currentStep === 1 && (
              <div className="space-y-4">
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
                      <Button type="button" variant="outline" onClick={() => {
                        setSelectedPatient(null)
                        setValue('patient_id', '')
                      }}>
                        Change
                      </Button>
                    </div>
                    {(selectedPatient.medical_alerts || selectedPatient.allergies) && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
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
              </div>
            )}

            {/* Step 2: Ward & Bed Selection */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Ward *</label>
                  <Select
                    value={watchedValues.ward_id}
                    onValueChange={(value) => {
                      setValue('ward_id', value)
                      setValue('bed_id', '')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a ward" />
                    </SelectTrigger>
                    <SelectContent>
                      {wards.map((ward) => (
                        <SelectItem key={ward.id} value={ward.id}>
                          {ward.name} ({ward.type}) - ₹{ward.daily_rate}/day
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.ward_id && (
                    <p className="text-sm text-red-600 mt-1">{errors.ward_id.message}</p>
                  )}
                </div>

                {selectedWard && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900">Ward Charges</h4>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Daily Rate:</span>
                        <span className="font-medium">₹{selectedWard.daily_rate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Nursing Charge:</span>
                        <span className="font-medium">₹{selectedWard.nursing_charge}</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-300 pt-1 font-semibold">
                        <span className="text-blue-900">Total per day:</span>
                        <span>₹{selectedWard.daily_rate + selectedWard.nursing_charge}</span>
                      </div>
                    </div>
                  </div>
                )}

                {watchedValues.ward_id && beds.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-3">Select Bed *</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {beds.map((bed) => (
                        <button
                          type="button"
                          key={bed.id}
                          disabled={bed.status !== 'available'}
                          onClick={() => selectBed(bed)}
                          className={`
                            relative p-3 rounded-lg border-2 text-center transition-all
                            ${watchedValues.bed_id === bed.id
                              ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                              : bed.status === 'available'
                              ? 'border-green-300 bg-green-50 hover:border-green-500 cursor-pointer'
                              : 'border-gray-300 bg-gray-50 cursor-not-allowed'
                            }
                          `}
                        >
                          <BedDouble className={`h-5 w-5 mx-auto mb-1 ${
                            watchedValues.bed_id === bed.id
                              ? 'text-blue-600'
                              : bed.status === 'available'
                              ? 'text-green-600'
                              : 'text-gray-400'
                          }`} />
                          <span className="text-xs font-medium block">{bed.bed_number}</span>
                          {watchedValues.bed_id === bed.id && (
                            <div className="absolute -top-1 -right-1 h-5 w-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    {errors.bed_id && (
                      <p className="text-sm text-red-600 mt-2">{errors.bed_id.message}</p>
                    )}
                  </div>
                )}

                {watchedValues.ward_id && beds.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No available beds in this ward</p>
                )}
              </div>
            )}

            {/* Step 3: Doctor & Diagnosis */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Attending Doctor</label>
                  <Select
                    value={watchedValues.doctor_id}
                    onValueChange={(value) => setValue('doctor_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          Dr. {doctor.name} ({doctor.specialization})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Chief Complaints</label>
                  <textarea
                    {...register('chief_complaints')}
                    className="w-full p-3 border rounded-md"
                    rows={3}
                    placeholder="Enter chief complaints or symptoms..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Provisional Diagnosis</label>
                  <textarea
                    {...register('diagnosis')}
                    className="w-full p-3 border rounded-md"
                    rows={3}
                    placeholder="Enter diagnosis..."
                  />
                </div>
              </div>
            )}

            {/* Step 4: Caretaker Information */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Caretaker Name *</label>
                  <Input
                    {...register('caretaker_name')}
                    placeholder="Name of attendant/caretaker"
                  />
                  {errors.caretaker_name && (
                    <p className="text-sm text-red-600 mt-1">{errors.caretaker_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Caretaker Mobile *</label>
                  <Input
                    {...register('caretaker_mobile')}
                    type="tel"
                    placeholder="10-digit mobile number"
                  />
                  {errors.caretaker_mobile && (
                    <p className="text-sm text-red-600 mt-1">{errors.caretaker_mobile.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Relation with Patient</label>
                  <Select
                    value={watchedValues.caretaker_relation}
                    onValueChange={(value) => setValue('caretaker_relation', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONS.map((relation) => (
                        <SelectItem key={relation} value={relation}>
                          {relation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 5: Vitals & Additional Info */}
            {currentStep === 5 && (
              <div className="space-y-6">
                {/* Vitals */}
                <div>
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Vital Signs
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Blood Pressure</label>
                      <Input
                        {...register('vitals_bp')}
                        placeholder="e.g., 120/80"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Pulse (bpm)</label>
                      <Input
                        {...register('vitals_pulse', { valueAsNumber: true })}
                        type="number"
                        placeholder="72"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Temperature (°F)</label>
                      <Input
                        {...register('vitals_temperature', { valueAsNumber: true })}
                        type="number"
                        step="0.1"
                        placeholder="98.6"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">SpO2 (%)</label>
                      <Input
                        {...register('vitals_spo2', { valueAsNumber: true })}
                        type="number"
                        placeholder="98"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                      <Input
                        {...register('vitals_weight', { valueAsNumber: true })}
                        type="number"
                        step="0.1"
                        placeholder="70"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Height (cm)</label>
                      <Input
                        {...register('vitals_height', { valueAsNumber: true })}
                        type="number"
                        placeholder="170"
                      />
                    </div>
                  </div>
                </div>

                {/* MLC */}
                <div className="border rounded-lg p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      {...register('is_mlc')}
                      type="checkbox"
                      className="h-5 w-5 rounded border-gray-300"
                    />
                    <div>
                      <span className="font-medium">Medico-Legal Case (MLC)</span>
                      <p className="text-sm text-gray-500">Check if this is a medico-legal case</p>
                    </div>
                  </label>

                  {watchedValues.is_mlc && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">MLC Number</label>
                        <Input
                          {...register('mlc_number')}
                          placeholder="Enter MLC number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Police Station</label>
                        <Input
                          {...register('police_station')}
                          placeholder="Name of police station"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Brought By</label>
                        <Input
                          {...register('brought_by')}
                          placeholder="Who brought the patient"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Insurance */}
                <div className="border rounded-lg p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      {...register('has_insurance')}
                      type="checkbox"
                      className="h-5 w-5 rounded border-gray-300"
                    />
                    <div>
                      <span className="font-medium">Insurance</span>
                      <p className="text-sm text-gray-500">Check if patient has insurance coverage</p>
                    </div>
                  </label>

                  {watchedValues.has_insurance && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Insurance Company</label>
                        <Input
                          {...register('insurance_company')}
                          placeholder="Name of insurance company"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Policy Number</label>
                        <Input
                          {...register('insurance_policy_number')}
                          placeholder="Policy/Card number"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Coverage Amount</label>
                        <Input
                          {...register('insurance_amount', { valueAsNumber: true })}
                          type="number"
                          placeholder="Maximum coverage"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < STEPS.length ? (
            <Button type="button" onClick={nextStep}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Admitting Patient...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Admit Patient
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
