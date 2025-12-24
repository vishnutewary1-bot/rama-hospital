'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { doctorSchema, type DoctorInput } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
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
import { useState } from 'react'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function NewDoctorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DoctorInput>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: '',
      specialization: '',
      qualification: '',
      phone: '',
      email: '',
      consultation_fee: 0,
      follow_up_fee: 0,
      is_visiting: false,
      visit_days: '',
      visit_timings: '',
      opd_days: '',
      opd_timings: '',
      bank_name: '',
      bank_account_number: '',
      bank_ifsc: '',
      commission_percentage: 0,
    },
  })

  const isVisiting = watch('is_visiting')

  const onSubmit = async (data: DoctorInput) => {
    setSubmitError('')
    setLoading(true)

    try {
      const { error } = await supabase.from('doctors').insert({
        name: data.name,
        specialization: data.specialization,
        qualification: data.qualification || null,
        phone: data.phone || null,
        email: data.email || null,
        consultation_fee: data.consultation_fee,
        follow_up_fee: data.follow_up_fee,
        is_visiting: data.is_visiting,
        visit_days: data.visit_days ? data.visit_days.split(',').map(d => d.trim()) : null,
        visit_timings: data.visit_timings || null,
        opd_days: data.opd_days || null,
        opd_timings: data.opd_timings || null,
        bank_name: data.bank_name || null,
        bank_account_number: data.bank_account_number || null,
        bank_ifsc: data.bank_ifsc || null,
        commission_percentage: data.commission_percentage || null,
      })

      if (error) throw error

      router.push('/doctors')
      router.refresh()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create doctor'
      setSubmitError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Add New Doctor</h1>
        <p className="text-gray-600 mt-1">Complete doctor registration with all required details</p>
      </div>

      <Card className="max-w-4xl p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Doctor Name *"
                placeholder="Dr. Full Name"
                error={errors.name?.message}
                {...register('name')}
              />

              <Input
                label="Specialization *"
                placeholder="e.g., General Surgeon, Physician, Cardiologist"
                error={errors.specialization?.message}
                {...register('specialization')}
              />

              <Input
                label="Qualification"
                placeholder="e.g., MBBS, MD, MS, DNB"
                error={errors.qualification?.message}
                {...register('qualification')}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                type="tel"
                placeholder="10-digit mobile number"
                maxLength={10}
                error={errors.phone?.message}
                {...register('phone')}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="doctor@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
          </div>

          {/* Fee Structure */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Fee Structure</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Consultation Fee *"
                type="number"
                min="0"
                step="1"
                placeholder="₹ 0"
                error={errors.consultation_fee?.message}
                {...register('consultation_fee', { valueAsNumber: true })}
              />

              <Input
                label="Follow-up Fee *"
                type="number"
                min="0"
                step="1"
                placeholder="₹ 0"
                error={errors.follow_up_fee?.message}
                {...register('follow_up_fee', { valueAsNumber: true })}
              />

              <Input
                label="Commission Percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g., 20"
                error={errors.commission_percentage?.message}
                {...register('commission_percentage', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Doctor Type & Schedule */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Doctor Type & Schedule</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Doctor Type *</label>
                <Select
                  value={isVisiting ? 'true' : 'false'}
                  onValueChange={(value) => setValue('is_visiting', value === 'true')}
                >
                  <SelectTrigger error={errors.is_visiting?.message}>
                    <SelectValue placeholder="Select doctor type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Full-time/Permanent Doctor</SelectItem>
                    <SelectItem value="true">Visiting/Consultant Doctor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="OPD Days"
                    placeholder="e.g., Monday, Wednesday, Friday"
                    error={errors.opd_days?.message}
                    {...register('opd_days')}
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated days for regular OPD</p>
                </div>

                <Input
                  label="OPD Timings"
                  placeholder="e.g., 10:00 AM - 2:00 PM"
                  error={errors.opd_timings?.message}
                  {...register('opd_timings')}
                />
              </div>

              {isVisiting && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Visit Days"
                      placeholder="e.g., Tuesday, Thursday"
                      error={errors.visit_days?.message}
                      {...register('visit_days')}
                    />
                    <p className="text-xs text-gray-500 mt-1">Specific days for visiting doctor</p>
                  </div>

                  <Input
                    label="Visit Timings"
                    placeholder="e.g., 6:00 PM - 8:00 PM"
                    error={errors.visit_timings?.message}
                    {...register('visit_timings')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bank Details for Commission */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Bank Details (For Commission Payment)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                placeholder="e.g., State Bank of India"
                error={errors.bank_name?.message}
                {...register('bank_name')}
              />

              <Input
                label="Account Number"
                placeholder="Bank account number"
                error={errors.bank_account_number?.message}
                {...register('bank_account_number')}
              />

              <Input
                label="IFSC Code"
                placeholder="e.g., SBIN0001234"
                maxLength={11}
                error={errors.bank_ifsc?.message}
                {...register('bank_ifsc')}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Bank details are required only if commission needs to be paid to the doctor
            </p>
          </div>

          {/* Error Display */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              <p className="font-medium">Error creating doctor</p>
              <p className="text-sm">{submitError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <Button type="submit" size="lg" loading={loading} disabled={loading}>
              Add Doctor
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
