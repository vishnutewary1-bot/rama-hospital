'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { opdConsultationSchema } from '@/lib/validations'
import type { OPDConsultationInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getInitials } from '@/lib/utils'
import {
  User,
  Activity,
  Stethoscope,
  FileText,
  Pill,
  Calendar,
  AlertCircle,
  Loader2,
  Heart,
  Thermometer,
  Wind,
  Weight,
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
}

interface Doctor {
  id: string
  name: string
  specialization: string
}

interface OPDRegistration {
  id: string
  registration_number: string
  patient_id: string
  doctor_id: string
  visit_type: string
  visit_reason: string
  token_number: string
  patient?: Patient
  doctor?: Doctor
}

export default function NewConsultationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const opdIdParam = searchParams.get('opd_id')

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [opdRegistration, setOpdRegistration] = useState<OPDRegistration | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<OPDConsultationInput>({
    resolver: zodResolver(opdConsultationSchema),
    defaultValues: {
      opd_id: opdIdParam || '',
      patient_id: '',
      doctor_id: '',
      chief_complaint: '',
      diagnosis: '',
    },
  })

  const watchedValues = watch()

  const fetchOPDRegistration = useCallback(async () => {
    if (!opdIdParam) {
      alert('OPD Registration ID is required')
      router.push('/opd/registrations')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/opd/registrations/${opdIdParam}`)
      const result = await response.json()

      if (result.success && result.data) {
        setOpdRegistration(result.data)
        setValue('opd_id', result.data.id)
        setValue('patient_id', result.data.patient_id)
        setValue('doctor_id', result.data.doctor_id)
        setValue('chief_complaint', result.data.visit_reason || '')
      } else {
        alert('OPD Registration not found')
        router.push('/opd/registrations')
      }
    } catch (error) {
      console.error('Error fetching OPD registration:', error)
      alert('Failed to load OPD registration')
      router.push('/opd/registrations')
    } finally {
      setLoading(false)
    }
  }, [opdIdParam, router, setValue])

  useEffect(() => {
    fetchOPDRegistration()
  }, [fetchOPDRegistration])

  async function onSubmit(data: OPDConsultationInput) {
    setSubmitting(true)

    try {
      const response = await fetch('/api/opd/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create consultation')
      }

      const result = await response.json()
      router.push('/opd/consultations')
    } catch (error) {
      console.error('Error creating consultation:', error)
      alert('Failed to create consultation. Please try again.')
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

  if (!opdRegistration) {
    return null
  }

  const patient = opdRegistration.patient
  const doctor = opdRegistration.doctor

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Consultation</h1>
        <p className="text-gray-500 mt-1">Record detailed consultation notes and treatment plan</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Patient & Doctor Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  {getInitials(patient?.name || '')}
                </div>
                <div>
                  <p className="font-semibold">{patient?.name}</p>
                  <p className="text-sm text-gray-600">
                    {patient?.age}Y / {patient?.gender} • {patient?.mobile}
                  </p>
                  {patient?.blood_group && (
                    <p className="text-sm text-red-600 font-medium">Blood: {patient.blood_group}</p>
                  )}
                </div>
              </div>
              {patient?.allergies && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                  <p className="flex items-center gap-1 text-red-700">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <strong>Allergies:</strong> {patient.allergies}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Doctor Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="font-semibold">Dr. {doctor?.name}</p>
                <p className="text-sm text-gray-600">{doctor?.specialization}</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p><strong>OPD No:</strong> {opdRegistration.registration_number}</p>
                  <p><strong>Token:</strong> {opdRegistration.token_number}</p>
                  <p><strong>Visit Type:</strong> {opdRegistration.visit_type}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vitals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Vital Signs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 text-red-500" />
                  BP Systolic
                </label>
                <Input
                  type="number"
                  {...register('bp_systolic', { valueAsNumber: true })}
                  placeholder="120"
                  error={errors.bp_systolic?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 text-red-500" />
                  BP Diastolic
                </label>
                <Input
                  type="number"
                  {...register('bp_diastolic', { valueAsNumber: true })}
                  placeholder="80"
                  error={errors.bp_diastolic?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-blue-500" />
                  Pulse (bpm)
                </label>
                <Input
                  type="number"
                  {...register('pulse', { valueAsNumber: true })}
                  placeholder="72"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                  Temp (°F)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  {...register('temperature', { valueAsNumber: true })}
                  placeholder="98.6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5 text-cyan-500" />
                  SpO2 (%)
                </label>
                <Input
                  type="number"
                  {...register('spo2', { valueAsNumber: true })}
                  placeholder="98"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5 text-teal-500" />
                  Resp. Rate
                </label>
                <Input
                  type="number"
                  {...register('respiratory_rate', { valueAsNumber: true })}
                  placeholder="16"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Weight className="h-3.5 w-3.5 text-purple-500" />
                  Weight (kg)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  {...register('weight', { valueAsNumber: true })}
                  placeholder="70"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Weight className="h-3.5 w-3.5 text-indigo-500" />
                  Height (cm)
                </label>
                <Input
                  type="number"
                  {...register('height', { valueAsNumber: true })}
                  placeholder="170"
                />
              </div>
            </div>

            {watchedValues.weight && watchedValues.height && watchedValues.height > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>BMI:</strong>{' '}
                  {(watchedValues.weight / Math.pow(watchedValues.height / 100, 2)).toFixed(2)} kg/m²
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clinical History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Clinical History & Examination
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Chief Complaint *</label>
              <textarea
                {...register('chief_complaint')}
                className="w-full p-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Main symptoms or complaints..."
              />
              {errors.chief_complaint && (
                <p className="text-sm text-red-600 mt-1">{errors.chief_complaint.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">History of Present Illness</label>
              <textarea
                {...register('history_of_present_illness')}
                className="w-full p-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Detailed history of current condition..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Past Medical History</label>
              <textarea
                {...register('past_medical_history')}
                className="w-full p-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Previous illnesses, surgeries, chronic conditions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Examination Findings</label>
              <textarea
                {...register('examination_findings')}
                className="w-full p-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Physical examination findings..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Diagnosis & Treatment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Diagnosis & Treatment Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Diagnosis *</label>
              <textarea
                {...register('diagnosis')}
                className="w-full p-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Final diagnosis or provisional diagnosis..."
              />
              {errors.diagnosis && (
                <p className="text-sm text-red-600 mt-1">{errors.diagnosis.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Treatment Plan</label>
              <textarea
                {...register('treatment_plan')}
                className="w-full p-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Recommended treatment approach, procedures, lifestyle modifications..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Investigations Ordered</label>
              <textarea
                {...register('investigations_ordered')}
                className="w-full p-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Lab tests, imaging, or other investigations requested..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Prescriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Medications Prescribed</label>
              <textarea
                {...register('prescriptions')}
                className="w-full p-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={6}
                placeholder="List medications with dosage, frequency, and duration&#10;Example:&#10;1. Tab Paracetamol 500mg - 1 tab TDS - 5 days&#10;2. Syrup Cough - 5ml BD - 7 days&#10;3. Cap Amoxicillin 500mg - 1 cap TDS - 7 days"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Advice & Instructions</label>
              <textarea
                {...register('advice')}
                className="w-full p-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="General advice, dietary instructions, precautions, when to return..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Follow-up */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Follow-up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Follow-up Date</label>
                <Input
                  type="date"
                  {...register('follow_up_date')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Follow-up Instructions</label>
              <textarea
                {...register('follow_up_instructions')}
                className="w-full p-3 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Instructions for next visit, what to monitor, when to come back..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 sticky bottom-0 bg-white py-4 border-t">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving Consultation...
              </>
            ) : (
              'Save Consultation'
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
