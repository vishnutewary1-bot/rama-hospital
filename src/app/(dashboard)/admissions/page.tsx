'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Admission } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Active')

  useEffect(() => {
    fetchAdmissions()
  }, [statusFilter])

  async function fetchAdmissions() {
    try {
      let query = supabase
        .from('admissions')
        .select(`
          *,
          patient:patients(name, registration_number, mobile),
          doctor:doctors(name)
        `)
        .order('admission_date', { ascending: false })
        .limit(100)

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setAdmissions(data || [])
    } catch (error) {
      console.error('Error fetching admissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAdmissions = admissions.filter(a =>
    a.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.admission_number.toLowerCase().includes(search.toLowerCase()) ||
    a.patient?.registration_number?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="text-center py-8">Loading admissions...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admissions</h1>
        <Link href="/admissions/new">
          <Button size="lg">+ New Admission</Button>
        </Link>
      </div>

      <Card>
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by patient name, admission number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Discharged', label: 'Discharged' },
                { value: 'LAMA', label: 'LAMA' },
              ]}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Adm. No.</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Admission Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdmissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No admissions found
                </TableCell>
              </TableRow>
            ) : (
              filteredAdmissions.map((admission) => (
                <TableRow key={admission.id}>
                  <TableCell className="font-medium">{admission.admission_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{admission.patient?.name}</p>
                      <p className="text-sm text-gray-500">{admission.patient?.registration_number}</p>
                    </div>
                  </TableCell>
                  <TableCell>{admission.ward_type}</TableCell>
                  <TableCell>{admission.doctor?.name || '-'}</TableCell>
                  <TableCell>
                    {new Date(admission.admission_date).toLocaleDateString('en-IN')}
                  </TableCell>
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
                    <div className="flex gap-2">
                      <Link href={`/admissions/${admission.id}`}>
                        <Button size="sm" variant="outline">View</Button>
                      </Link>
                      {admission.status === 'Active' && (
                        <Link href={`/billing/${admission.id}`}>
                          <Button size="sm" variant="success">Bill</Button>
                        </Link>
                      )}
                    </div>
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
