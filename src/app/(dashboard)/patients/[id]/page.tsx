'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Patient, Admission } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export default function PatientDetailsPage() {
  const params = useParams()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [admissions, setAdmissions] = useState<Admission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchPatient()
      fetchAdmissions()
    }
  }, [params.id])

  async function fetchPatient() {
    const { data, error } = await supabase
      .from('patients')
      .select(`
        *,
        area:areas(name),
        referral:referrals(name)
      `)
      .eq('id', params.id)
      .single()

    if (!error && data) {
      setPatient(data)
    }
    setLoading(false)
  }

  async function fetchAdmissions() {
    const { data } = await supabase
      .from('admissions')
      .select(`
        *,
        doctor:doctors(name)
      `)
      .eq('patient_id', params.id)
      .order('admission_date', { ascending: false })

    setAdmissions(data || [])
  }

  if (loading) {
    return <div className="text-center py-8">Loading patient details...</div>
  }

  if (!patient) {
    return <div className="text-center py-8 text-red-600">Patient not found</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Patient Details</h1>
        <div className="flex gap-2">
          <Link href={`/admissions/new?patient=${patient.id}`}>
            <Button size="lg" variant="success">+ New Admission</Button>
          </Link>
          <Link href="/patients">
            <Button variant="outline">Back to List</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Patient Information">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Registration No:</span>
              <span className="font-semibold">{patient.registration_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-semibold">{patient.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Age / Gender:</span>
              <span className="font-semibold">{patient.age} years / {patient.gender}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mobile:</span>
              <span className="font-semibold">{patient.mobile}</span>
            </div>
            {patient.alternate_mobile && (
              <div className="flex justify-between">
                <span className="text-gray-600">Alt. Mobile:</span>
                <span className="font-semibold">{patient.alternate_mobile}</span>
              </div>
            )}
            {patient.blood_group && (
              <div className="flex justify-between">
                <span className="text-gray-600">Blood Group:</span>
                <span className="font-semibold">{patient.blood_group}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="Address & Referral">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Address:</span>
              <span className="font-semibold">{patient.address || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Area:</span>
              <span className="font-semibold">{patient.area?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Referral:</span>
              <span className="font-semibold">{patient.referral?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Registered On:</span>
              <span className="font-semibold">
                {new Date(patient.created_at).toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Admission History">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admission No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  No admission history
                </TableCell>
              </TableRow>
            ) : (
              admissions.map((admission) => (
                <TableRow key={admission.id}>
                  <TableCell className="font-medium">{admission.admission_number}</TableCell>
                  <TableCell>
                    {new Date(admission.admission_date).toLocaleDateString('en-IN')}
                  </TableCell>
                  <TableCell>{admission.ward_type}</TableCell>
                  <TableCell>{admission.doctor?.name || '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-sm ${
                      admission.status === 'Active'
                        ? 'bg-green-100 text-green-700'
                        : admission.status === 'Discharged'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {admission.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admissions/${admission.id}`}>
                      <Button size="sm" variant="outline">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
