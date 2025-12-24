'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { medicalRecordService, patientService } from '@/lib/database'
import { MedicalRecord, RecordType } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, getInitials } from '@/lib/utils'
import {
  FileText,
  Search,
  Plus,
  Filter,
  Stethoscope,
  Pill,
  ClipboardList,
  Heart,
  Loader2,
  Eye,
  Printer,
  Calendar,
  User
} from 'lucide-react'

const RECORD_TYPES: { value: RecordType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'consultation', label: 'Consultation', icon: <Stethoscope className="h-4 w-4" />, color: 'bg-blue-100 text-blue-600' },
  { value: 'prescription', label: 'Prescription', icon: <Pill className="h-4 w-4" />, color: 'bg-green-100 text-green-600' },
  { value: 'progress_note', label: 'Progress Note', icon: <ClipboardList className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-600' },
  { value: 'surgery_note', label: 'Surgery Note', icon: <Heart className="h-4 w-4" />, color: 'bg-red-100 text-red-600' },
  { value: 'discharge_summary', label: 'Discharge Summary', icon: <FileText className="h-4 w-4" />, color: 'bg-purple-100 text-purple-600' },
  { value: 'investigation', label: 'Investigation', icon: <FileText className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-600' },
  { value: 'procedure', label: 'Procedure', icon: <FileText className="h-4 w-4" />, color: 'bg-orange-100 text-orange-600' },
  { value: 'other', label: 'Other', icon: <FileText className="h-4 w-4" />, color: 'bg-gray-100 text-gray-600' },
]

export default function MedicalRecordsPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState<string>('all')

  const isAdmin = user?.role === 'admin'
  const isDoctor = user?.role === 'doctor'
  const canCreate = isAdmin || isDoctor

  useEffect(() => {
    fetchRecords()
  }, [])

  async function fetchRecords() {
    try {
      const data = await medicalRecordService.getAll()
      setRecords(data)
    } catch (error) {
      console.error('Error fetching records:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = records.filter(record => {
    const matchesSearch = searchQuery === '' ||
      record.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.content?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = activeType === 'all' || record.record_type === activeType

    return matchesSearch && matchesType
  })

  const getRecordTypeConfig = (type: RecordType) => {
    return RECORD_TYPES.find(t => t.value === type) || RECORD_TYPES[RECORD_TYPES.length - 1]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-gray-500">View and manage patient medical records</p>
        </div>
        {canCreate && (
          <Link href="/medical-records/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Record
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by patient name, title, or content..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Type Tabs */}
      <Tabs value={activeType} onValueChange={setActiveType}>
        <TabsList>
          <TabsTrigger value="all">All Records</TabsTrigger>
          {RECORD_TYPES.map((type) => (
            <TabsTrigger key={type.value} value={type.value}>
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeType} className="mt-6">
          {filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No medical records found</p>
                {canCreate && (
                  <Link href="/medical-records/new">
                    <Button variant="outline" className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Record
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => {
                const typeConfig = getRecordTypeConfig(record.record_type)
                return (
                  <Card key={record.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Type Icon */}
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${typeConfig.color}`}>
                          {typeConfig.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">
                                  {record.title || typeConfig.label}
                                </h3>
                                <Badge variant="outline" className={typeConfig.color}>
                                  {typeConfig.label}
                                </Badge>
                              </div>

                              {/* Patient Info */}
                              {record.patient && (
                                <Link href={`/patients/${record.patient_id}`} className="flex items-center gap-2 mt-1 text-sm text-blue-600 hover:underline">
                                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                                    {getInitials(record.patient.name)}
                                  </div>
                                  {record.patient.name}
                                  <span className="text-gray-400">({record.patient.registration_number})</span>
                                </Link>
                              )}

                              {/* Content Preview */}
                              {record.content && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {record.content}
                                </p>
                              )}

                              {/* Meta Info */}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(record.record_date, 'long')}
                                </span>
                                {record.doctor && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    Dr. {record.doctor.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <Link href={`/medical-records/${record.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button variant="ghost" size="sm">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
