'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'

export default function NewDoctorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    qualification: '',
    phone: '',
    email: '',
    consultation_fee: '',
    follow_up_fee: '',
    is_visiting: 'false',
    visit_timings: '',
  })
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.from('doctors').insert({
        name: formData.name,
        specialization: formData.specialization,
        qualification: formData.qualification || null,
        phone: formData.phone || null,
        email: formData.email || null,
        consultation_fee: parseFloat(formData.consultation_fee) || 0,
        follow_up_fee: parseFloat(formData.follow_up_fee) || 0,
        is_visiting: formData.is_visiting === 'true',
        visit_timings: formData.visit_timings || null,
      })

      if (error) throw error

      router.push('/doctors')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create doctor'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New Doctor</h1>

      <Card className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <Input
            id="name"
            label="Doctor Name *"
            placeholder="Dr. Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            id="specialization"
            label="Specialization *"
            placeholder="e.g., General Surgeon, Physician"
            value={formData.specialization}
            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            required
          />

          <Input
            id="qualification"
            label="Qualification"
            placeholder="e.g., MBBS, MS"
            value={formData.qualification}
            onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="phone"
              type="tel"
              label="Phone"
              placeholder="Phone number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="consultation_fee"
              type="number"
              label="Consultation Fee"
              placeholder="₹"
              value={formData.consultation_fee}
              onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
            />

            <Input
              id="follow_up_fee"
              type="number"
              label="Follow-up Fee"
              placeholder="₹"
              value={formData.follow_up_fee}
              onChange={(e) => setFormData({ ...formData, follow_up_fee: e.target.value })}
            />
          </div>

          <Select
            id="is_visiting"
            label="Doctor Type"
            value={formData.is_visiting}
            onChange={(e) => setFormData({ ...formData, is_visiting: e.target.value })}
            options={[
              { value: 'false', label: 'Full-time Doctor' },
              { value: 'true', label: 'Visiting Doctor' },
            ]}
          />

          {formData.is_visiting === 'true' && (
            <Input
              id="visit_timings"
              label="Visit Timings"
              placeholder="e.g., Mon, Wed, Fri - 10 AM to 2 PM"
              value={formData.visit_timings}
              onChange={(e) => setFormData({ ...formData, visit_timings: e.target.value })}
            />
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" size="lg" loading={loading}>
              Add Doctor
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
