'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { patientService, doctorService, admissionService, medicalRecordService } from '@/lib/database'
import { Patient, Doctor, Admission, RecordType } from '@/types/database'
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
  FileText,
  Search,
  ArrowLeft,
  Stethoscope,
  Pill,
  ClipboardList,
  Heart,
  Loader2,
  Save,
  Phone,
  Activity,
  Thermometer,
  Scale
} from 'lucide-react'

const RECORD_TYPES: { value: RecordType; label: string; icon: React.ReactNode }[] = [
  { value: 'consultation', label: 'Consultation', icon: <Stethoscope className="h-5 w-5" /> },
  { value: 'prescription', label: 'Prescription', icon: <Pill className="h-5 w-5" /> },
  { value: 'progress_note', label: 'Progress Note', icon: <ClipboardList className="h-5 w-5" /> },
  { value: 'surgery_note', label: 'Surgery Note', icon: <Heart className="h-5 w-5" /> },
  { value: 'discharge_summary', label: 'Discharge Summary', icon: <FileText className="h-5 w-5" /> },
  { value: 'investigation', label: 'Investigation Report', icon: <FileText className="h-5 w-5" /> },
  { value: 'procedure', label: 'Procedure Note', icon: <FileText className="h-5 w-5" /> },
  { value: 'other', label: 'Other', icon: <FileText className="h-5 w-5" /> },
]

export default function NewMedicalRecordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const patientIdParam = searchParams.get('patient')
  const admissionIdParam = searchParams.get('admission')
  const typeParam = searchParams.get('type') as RecordType | null

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Data
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [showPatientSearch, setShowPatientSearch] = useState(false)

  const [formData, setFormData] = useState({
    patient_id: patientIdParam || '',
    admission_id: admissionIdParam || '',
    record_type: typeParam || 'consultation' as RecordType,
    doctor_id: user?.role === 'doctor' ? '' : '', // Will be set from user's doctor profile
    title: '',
    content: '',
    diagnosis: '',
    treatment_plan: '',
    prescriptions: '',
    follow_up_date: '',
    vitals_bp: '',
    vitals_pulse: '' as number | '',
    vitals_temperature: '' as number | '',
    vitals_spo2: '' as number | '',
    vitals_weight: '' as number | ''
  })

  const fetchInitialData = useCallback(async () => {
    setLoading(true)
    try {
      const doctorsData = await doctorService.getAll()
      setDoctors(doctorsData.filter(d => d.is_active))

      if (patientIdParam) {
        const patient = await patientService.getById(patientIdParam)
        if (patient) {
          setSelectedPatient(patient)
          setFormData(prev => ({ ...prev, patient_id: patientIdParam }))
        }
      }

      if (admissionIdParam) {
        const admission = await admissionService.getById(admissionIdParam)
        if (admission) {
          setSelectedAdmission(admission)
          setSelectedPatient(admission.patient || null)
          setFormData(prev => ({
            ...prev,
            admission_id: admissionIdParam,
            patient_id: admission.patient_id
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [patientIdParam, admissionIdParam])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  // Search patients
  async function searchPatients(query: string) {
    if (query.length < 2) {
      setPatients([])
      return
    }
    try {
      const results = await patientService.search(query)
      setPatients(results)
    } catch (error) {
      console.error('Error searching patients:', error)
    }
  }

  function selectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setFormData(prev => ({ ...prev, patient_id: patient.id }))
    setShowPatientSearch(false)
    setPatientSearch('')
    setPatients([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.patient_id) {
      setError('Please select a patient')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const recordData = {
        patient_id: formData.patient_id,
        admission_id: formData.admission_id || undefined,
        record_type: formData.record_type,
        record_date: new Date().toISOString(),
        doctor_id: formData.doctor_id || undefined,
        title: formData.title || undefined,
        content: formData.content || undefined,
        diagnosis: formData.diagnosis || undefined,
        treatment_plan: formData.treatment_plan || undefined,
        prescriptions: formData.prescriptions || undefined,
        follow_up_date: formData.follow_up_date || undefined,
        vitals_bp: formData.vitals_bp || undefined,
        vitals_pulse: formData.vitals_pulse ? Number(formData.vitals_pulse) : undefined,
        vitals_temperature: formData.vitals_temperature ? Number(formData.vitals_temperature) : undefined,
        vitals_spo2: formData.vitals_spo2 ? Number(formData.vitals_spo2) : undefined,
        vitals_weight: formData.vitals_weight ? Number(formData.vitals_weight) : undefined,
        created_by: user?.id || ''
      }

      const record = await medicalRecordService.create(recordData)

      // Redirect based on context
      if (admissionIdParam) {
        router.push(`/admissions/${admissionIdParam}?tab=records`)
      } else if (patientIdParam) {
        router.push(`/patients/${patientIdParam}?tab=records`)
      } else {
        router.push('/medical-records')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create record'
      setError(errorMessage)
      setSubmitting(false)
    }
  }

  const showVitals = ['progress_note', 'consultation'].includes(formData.record_type)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Medical Record</h1>
          <p className="text-gray-500">Create a new medical record for a patient</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Patient Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPatient ? (
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                    {getInitials(selectedPatient.name)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{selectedPatient.name}</h3>
                    <p className="text-sm text-gray-600">
                      {selectedPatient.registration_number} • {selectedPatient.age} years • {selectedPatient.gender}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedPatient.mobile}
                      </span>
                    </div>
                  </div>
                  {!admissionIdParam && (
                    <Button variant="outline" type="button" onClick={() => {
                      setSelectedPatient(null)
                      setFormData(prev => ({ ...prev, patient_id: '' }))
                    }}>
                      Change
                    </Button>
                  )}
                </div>
                {selectedAdmission && (
                  <div className="mt-3 pt-3 border-t">
                    <Badge variant="outline">
                      Admission: {selectedAdmission.admission_number}
                    </Badge>
                    <span className="ml-2 text-sm text-gray-500">
                      {selectedAdmission.ward?.name || selectedAdmission.ward_type}
                      {selectedAdmission.bed && ` - Bed ${selectedAdmission.bed.bed_number}`}
                    </span>
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
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {patients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left"
                        onClick={() => selectPatient(patient)}
                      >
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                          {getInitials(patient.name)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{patient.name}</p>
                          <p className="text-xs text-gray-500">
                            {patient.registration_number} • {patient.mobile}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Record Type */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Record Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {RECORD_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, record_type: type.value }))}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    formData.record_type === type.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`h-10 w-10 mx-auto rounded-full flex items-center justify-center mb-2 ${
                    formData.record_type === type.value
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {type.icon}
                  </div>
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Record Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Record Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Title"
              placeholder={`Enter ${RECORD_TYPES.find(t => t.value === formData.record_type)?.label} title...`}
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />

            <div>
              <label className="block text-sm font-medium mb-2">Doctor</label>
              <Select
                value={formData.doctor_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, doctor_id: value }))}
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
              <label className="block text-sm font-medium mb-2">
                {formData.record_type === 'prescription' ? 'Prescription' :
                 formData.record_type === 'consultation' ? 'Notes' :
                 formData.record_type === 'progress_note' ? 'Progress Notes' :
                 formData.record_type === 'surgery_note' ? 'Surgery Details' :
                 formData.record_type === 'discharge_summary' ? 'Discharge Summary' :
                 'Content'}
              </label>
              <textarea
                className="w-full p-3 border rounded-md min-h-[200px]"
                placeholder={`Enter ${RECORD_TYPES.find(t => t.value === formData.record_type)?.label.toLowerCase()} details...`}
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Diagnosis</label>
              <textarea
                className="w-full p-3 border rounded-md min-h-[120px]"
                placeholder="Enter diagnosis..."
                value={formData.diagnosis}
                onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Treatment Plan</label>
              <textarea
                className="w-full p-3 border rounded-md min-h-[120px]"
                placeholder="Enter treatment plan..."
                value={formData.treatment_plan}
                onChange={(e) => setFormData(prev => ({ ...prev, treatment_plan: e.target.value }))}
              />
            </div>

            {formData.record_type === 'prescription' && (
              <div>
                <label className="block text-sm font-medium mb-2">Prescriptions</label>
                <textarea
                  className="w-full p-3 border rounded-md min-h-[150px] font-mono text-sm"
                  placeholder="Enter prescriptions (one per line)...&#10;Example:&#10;1. Tab. Paracetamol 500mg - 1-0-1 after food x 5 days&#10;2. Tab. Amoxicillin 500mg - 1-1-1 after food x 7 days"
                  value={formData.prescriptions}
                  onChange={(e) => setFormData(prev => ({ ...prev, prescriptions: e.target.value }))}
                />
              </div>
            )}

            <Input
              label="Follow-up Date"
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
            />
          </CardContent>
        </Card>

        {/* Vitals (conditional) */}
        {showVitals && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Vital Signs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Input
                  label="Blood Pressure"
                  placeholder="e.g., 120/80"
                  value={formData.vitals_bp}
                  onChange={(e) => setFormData(prev => ({ ...prev, vitals_bp: e.target.value }))}
                />
                <Input
                  label="Pulse (bpm)"
                  type="number"
                  placeholder="72"
                  value={formData.vitals_pulse}
                  onChange={(e) => setFormData(prev => ({ ...prev, vitals_pulse: e.target.value ? Number(e.target.value) : '' }))}
                />
                <Input
                  label="Temperature (°F)"
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={formData.vitals_temperature}
                  onChange={(e) => setFormData(prev => ({ ...prev, vitals_temperature: e.target.value ? Number(e.target.value) : '' }))}
                />
                <Input
                  label="SpO2 (%)"
                  type="number"
                  placeholder="98"
                  value={formData.vitals_spo2}
                  onChange={(e) => setFormData(prev => ({ ...prev, vitals_spo2: e.target.value ? Number(e.target.value) : '' }))}
                />
                <Input
                  label="Weight (kg)"
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={formData.vitals_weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, vitals_weight: e.target.value ? Number(e.target.value) : '' }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !formData.patient_id}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Record
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
