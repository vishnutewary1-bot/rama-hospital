'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { Search, FileText, Calendar, Users, Stethoscope } from 'lucide-react'

interface OPDConsultation {
  id: string
  consultation_date: string
  chief_complaint: string
  diagnosis: string
  treatment_plan?: string
  prescriptions?: string
  follow_up_date?: string
  patient?: {
    id: string
    name: string
    age: number
    gender: string
    mobile: string
    registration_number: string
  }
  doctor?: {
    id: string
    name: string
    specialization: string
  }
  opd_registration?: {
    id: string
    registration_number: string
    visit_date: string
    visit_type: string
    token_number: string
  }
}

export default function OPDConsultationsPage() {
  const [consultations, setConsultations] = useState<OPDConsultation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [doctorFilter, setDoctorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [doctors, setDoctors] = useState<any[]>([])

  useEffect(() => {
    fetchDoctors()
    fetchConsultations()
  }, [doctorFilter, dateFrom, dateTo])

  async function fetchDoctors() {
    try {
      const response = await fetch('/api/doctors?is_active=true')
      const result = await response.json()
      if (result.success) {
        setDoctors(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
    }
  }

  async function fetchConsultations() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (doctorFilter) params.append('doctor_id', doctorFilter)
      if (dateFrom) params.append('from_date', dateFrom)
      if (dateTo) params.append('to_date', dateTo)

      const response = await fetch(`/api/opd/consultations?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setConsultations(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching consultations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredConsultations = consultations.filter(c =>
    c.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.patient?.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
    c.opd_registration?.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
    c.chief_complaint?.toLowerCase().includes(search.toLowerCase()) ||
    c.diagnosis?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="text-center py-8">Loading consultations...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">OPD Consultations</h1>
          <p className="text-gray-500 mt-1">View and manage consultation records</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Consultations</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{consultations.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Unique Patients</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {new Set(consultations.map(c => c.patient?.id)).size}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Follow-ups Scheduled</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {consultations.filter(c => c.follow_up_date).length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by patient, OPD number, complaint, diagnosis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="w-full md:w-48">
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Doctors</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Input
                type="date"
                placeholder="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="w-full md:w-48">
              <Input
                type="date"
                placeholder="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>OPD No.</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Chief Complaint</TableHead>
              <TableHead>Diagnosis</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredConsultations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  No consultations found
                </TableCell>
              </TableRow>
            ) : (
              filteredConsultations.map((consultation) => (
                <TableRow key={consultation.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatDate(consultation.consultation_date, 'short')}</p>
                      <p className="text-sm text-gray-500">{formatDate(consultation.consultation_date, 'time')}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <p>{consultation.opd_registration?.registration_number}</p>
                      {consultation.opd_registration?.token_number && (
                        <p className="text-sm text-gray-500">Token: {consultation.opd_registration.token_number}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{consultation.patient?.name}</p>
                      <p className="text-sm text-gray-500">
                        {consultation.patient?.age}Y / {consultation.patient?.gender.charAt(0)} • {consultation.patient?.mobile}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">Dr. {consultation.doctor?.name}</p>
                      <p className="text-sm text-gray-500">{consultation.doctor?.specialization}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate">{consultation.chief_complaint}</p>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate">{consultation.diagnosis}</p>
                  </TableCell>
                  <TableCell>
                    {consultation.follow_up_date ? (
                      <div>
                        <p className="text-sm font-medium text-purple-600">
                          {formatDate(consultation.follow_up_date, 'short')}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/opd/consultations/${consultation.id}`}>
                        <Button size="sm" variant="outline">View</Button>
                      </Link>
                      {consultation.prescriptions && (
                        <Button size="sm" variant="ghost">
                          Print Rx
                        </Button>
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
