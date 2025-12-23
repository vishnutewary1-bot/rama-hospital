'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Patient } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchPatients()
  }, [])

  async function fetchPatients() {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          area:areas(name),
          referral:referrals(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setPatients(data || [])
    } catch (error) {
      console.error('Error fetching patients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.registration_number.toLowerCase().includes(search.toLowerCase()) ||
    p.mobile.includes(search)
  )

  if (loading) {
    return <div className="text-center py-8">Loading patients...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Patients</h1>
        <Link href="/patients/new">
          <Button size="lg">+ New Patient</Button>
        </Link>
      </div>

      <Card>
        <div className="mb-4">
          <Input
            placeholder="Search by name, registration number, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reg. No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Age/Gender</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  No patients found
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">{patient.registration_number}</TableCell>
                  <TableCell>{patient.name}</TableCell>
                  <TableCell>{patient.age} / {patient.gender.charAt(0)}</TableCell>
                  <TableCell>{patient.mobile}</TableCell>
                  <TableCell>{patient.area?.name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/patients/${patient.id}`}>
                        <Button size="sm" variant="outline">View</Button>
                      </Link>
                      <Link href={`/admissions/new?patient=${patient.id}`}>
                        <Button size="sm" variant="success">Admit</Button>
                      </Link>
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
