'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Area, Referral } from '@/types/database'
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

export default function NewPatientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [areas, setAreas] = useState<Area[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    mobile: '',
    alternate_mobile: '',
    address: '',
    area_id: '',
    referral_id: '',
    blood_group: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDropdownData()
  }, [])

  async function fetchDropdownData() {
    const [areasRes, referralsRes] = await Promise.all([
      supabase.from('areas').select('*').eq('is_active', true).order('name'),
      supabase.from('referrals').select('*').eq('is_active', true).order('name'),
    ])
    setAreas(areasRes.data || [])
    setReferrals(referralsRes.data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          name: formData.name,
          age: parseInt(formData.age),
          gender: formData.gender,
          mobile: formData.mobile,
          alternate_mobile: formData.alternate_mobile || null,
          address: formData.address || null,
          area_id: formData.area_id || null,
          referral_id: formData.referral_id || null,
          blood_group: formData.blood_group || null,
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/patients/${data.id}`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create patient'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Patient Registration</h1>

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <Input
            id="name"
            label="Patient Name *"
            placeholder="Enter patient name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="age"
              type="number"
              label="Age *"
              placeholder="Age"
              min="0"
              max="150"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              required
            />

            <div>
              <label htmlFor="gender" className="block text-sm font-medium mb-2">Gender *</label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Input
            id="mobile"
            type="tel"
            label="Mobile Number *"
            placeholder="10-digit mobile number"
            pattern="[0-9]{10}"
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            required
          />

          <Input
            id="alternate_mobile"
            type="tel"
            label="Alternate Mobile"
            placeholder="Optional alternate number"
            value={formData.alternate_mobile}
            onChange={(e) => setFormData({ ...formData, alternate_mobile: e.target.value })}
          />

          <Input
            id="address"
            label="Address"
            placeholder="Patient address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div>
            <label htmlFor="area_id" className="block text-sm font-medium mb-2">Area</label>
            <Select value={formData.area_id} onValueChange={(value) => setFormData({ ...formData, area_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select area..." />
              </SelectTrigger>
              <SelectContent>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="referral_id" className="block text-sm font-medium mb-2">Referral Source</label>
            <Select value={formData.referral_id} onValueChange={(value) => setFormData({ ...formData, referral_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select referral source..." />
              </SelectTrigger>
              <SelectContent>
                {referrals.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="blood_group" className="block text-sm font-medium mb-2">Blood Group</label>
            <Select value={formData.blood_group} onValueChange={(value) => setFormData({ ...formData, blood_group: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select blood group..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B-">B-</SelectItem>
                <SelectItem value="O+">O+</SelectItem>
                <SelectItem value="O-">O-</SelectItem>
                <SelectItem value="AB+">AB+</SelectItem>
                <SelectItem value="AB-">AB-</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" size="lg" loading={loading}>
              Save Patient
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
