'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Patient, Doctor } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'

export default function NewAdmissionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patient')

  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [formData, setFormData] = useState({
    patient_id: patientId || '',
    ward_type: 'General',
    doctor_id: '',
    caretaker_name: '',
    caretaker_mobile: '',
    caretaker_relation: '',
    diagnosis: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDropdownData()
  }, [])

  useEffect(() => {
    if (patientId) {
      fetchPatient(patientId)
    }
  }, [patientId])

  async function fetchDropdownData() {
    const [patientsRes, doctorsRes] = await Promise.all([
      supabase.from('patients').select('*').order('name').limit(500),
      supabase.from('doctors').select('*').eq('is_active', true).order('name'),
    ])
    setPatients(patientsRes.data || [])
    setDoctors(doctorsRes.data || [])
  }

  async function fetchPatient(id: string) {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      setSelectedPatient(data)
      setFormData(prev => ({ ...prev, patient_id: id }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Create admission
      const { data: admission, error: admissionError } = await supabase
        .from('admissions')
        .insert({
          patient_id: formData.patient_id,
          ward_type: formData.ward_type,
          doctor_id: formData.doctor_id || null,
          caretaker_name: formData.caretaker_name,
          caretaker_mobile: formData.caretaker_mobile,
          caretaker_relation: formData.caretaker_relation || null,
          diagnosis: formData.diagnosis || null,
          status: 'Active',
        })
        .select()
        .single()

      if (admissionError) throw admissionError

      // Create a draft bill for this admission
      await supabase
        .from('bills')
        .insert({
          admission_id: admission.id,
          patient_id: formData.patient_id,
          status: 'Draft',
        })

      router.push(`/admissions/${admission.id}`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create admission'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Admission</h1>

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          {selectedPatient ? (
            <div className="bg-blue-50 p-4 rounded mb-4">
              <h3 className="font-semibold text-blue-800">Selected Patient</h3>
              <p className="text-blue-700">
                {selectedPatient.name} ({selectedPatient.registration_number})
              </p>
              <p className="text-sm text-blue-600">
                {selectedPatient.age} years / {selectedPatient.gender} | Mobile: {selectedPatient.mobile}
              </p>
            </div>
          ) : (
            <Select
              id="patient_id"
              label="Select Patient *"
              value={formData.patient_id}
              onChange={(e) => {
                setFormData({ ...formData, patient_id: e.target.value })
                const patient = patients.find(p => p.id === e.target.value)
                setSelectedPatient(patient || null)
              }}
              options={patients.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.registration_number})`,
              }))}
              required
            />
          )}

          <Select
            id="ward_type"
            label="Ward Type *"
            value={formData.ward_type}
            onChange={(e) => setFormData({ ...formData, ward_type: e.target.value })}
            options={[
              { value: 'General', label: 'General Ward' },
              { value: 'ICU', label: 'ICU' },
              { value: 'NICU', label: 'NICU' },
              { value: 'Private', label: 'Private Room' },
            ]}
            required
          />

          <Select
            id="doctor_id"
            label="Attending Doctor"
            value={formData.doctor_id}
            onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
            options={doctors.map((d) => ({
              value: d.id,
              label: `${d.name} (${d.specialization})`,
            }))}
          />

          <Input
            id="diagnosis"
            label="Diagnosis / Chief Complaint"
            placeholder="Enter diagnosis or symptoms"
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
          />

          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-gray-800 mb-4">Caretaker Information</h3>
          </div>

          <Input
            id="caretaker_name"
            label="Caretaker Name *"
            placeholder="Name of attendant/caretaker"
            value={formData.caretaker_name}
            onChange={(e) => setFormData({ ...formData, caretaker_name: e.target.value })}
            required
          />

          <Input
            id="caretaker_mobile"
            type="tel"
            label="Caretaker Mobile *"
            placeholder="10-digit mobile number"
            pattern="[0-9]{10}"
            value={formData.caretaker_mobile}
            onChange={(e) => setFormData({ ...formData, caretaker_mobile: e.target.value })}
            required
          />

          <Select
            id="caretaker_relation"
            label="Relation with Patient"
            value={formData.caretaker_relation}
            onChange={(e) => setFormData({ ...formData, caretaker_relation: e.target.value })}
            options={[
              { value: 'Spouse', label: 'Spouse' },
              { value: 'Son', label: 'Son' },
              { value: 'Daughter', label: 'Daughter' },
              { value: 'Father', label: 'Father' },
              { value: 'Mother', label: 'Mother' },
              { value: 'Brother', label: 'Brother' },
              { value: 'Sister', label: 'Sister' },
              { value: 'Friend', label: 'Friend' },
              { value: 'Other', label: 'Other' },
            ]}
          />

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" size="lg" loading={loading}>
              Admit Patient
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
      </Card>
    </div>
  )
}
