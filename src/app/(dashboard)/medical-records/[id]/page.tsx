'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { medicalRecordService } from '@/lib/database'
import { MedicalRecord, RecordType } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate, getInitials } from '@/lib/utils'
import {
  FileText,
  ArrowLeft,
  Stethoscope,
  Pill,
  ClipboardList,
  Heart,
  Loader2,
  Printer,
  Edit,
  Save,
  X,
  Calendar,
  User,
  Activity,
  Paperclip,
  Download,
  Upload
} from 'lucide-react'

const RECORD_TYPES: { value: RecordType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'consultation', label: 'Consultation', icon: <Stethoscope className="h-5 w-5" />, color: 'bg-blue-100 text-blue-600' },
  { value: 'prescription', label: 'Prescription', icon: <Pill className="h-5 w-5" />, color: 'bg-green-100 text-green-600' },
  { value: 'progress_note', label: 'Progress Note', icon: <ClipboardList className="h-5 w-5" />, color: 'bg-yellow-100 text-yellow-600' },
  { value: 'surgery_note', label: 'Surgery Note', icon: <Heart className="h-5 w-5" />, color: 'bg-red-100 text-red-600' },
  { value: 'discharge_summary', label: 'Discharge Summary', icon: <FileText className="h-5 w-5" />, color: 'bg-purple-100 text-purple-600' },
  { value: 'investigation', label: 'Investigation Report', icon: <FileText className="h-5 w-5" />, color: 'bg-indigo-100 text-indigo-600' },
  { value: 'procedure', label: 'Procedure Note', icon: <FileText className="h-5 w-5" />, color: 'bg-orange-100 text-orange-600' },
  { value: 'other', label: 'Other', icon: <FileText className="h-5 w-5" />, color: 'bg-gray-100 text-gray-600' },
]

export default function MedicalRecordDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const printRef = useRef<HTMLDivElement>(null)

  const [record, setRecord] = useState<MedicalRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editData, setEditData] = useState({
    title: '',
    content: '',
    diagnosis: '',
    treatment_plan: '',
    prescriptions: '',
    follow_up_date: '',
    vitals_bp: '',
    vitals_pulse: '' as number | '',
    vitals_temperature: '' as number | '',
    vitals_spo2: '' as number | '',
    vitals_weight: '' as number | ''
  })

  const isAdmin = user?.role === 'admin'
  const isDoctor = user?.role === 'doctor'
  const canEdit = isAdmin || isDoctor

  useEffect(() => {
    fetchRecord()
  }, [params.id])

  async function fetchRecord() {
    try {
      const data = await medicalRecordService.getById(params.id as string)
      if (data) {
        setRecord(data)
        setEditData({
          title: data.title || '',
          content: data.content || '',
          diagnosis: data.diagnosis || '',
          treatment_plan: data.treatment_plan || '',
          prescriptions: data.prescriptions || '',
          follow_up_date: data.follow_up_date || '',
          vitals_bp: data.vitals_bp || '',
          vitals_pulse: data.vitals_pulse || '',
          vitals_temperature: data.vitals_temperature || '',
          vitals_spo2: data.vitals_spo2 || '',
          vitals_weight: data.vitals_weight || ''
        })
      }
    } catch (error) {
      console.error('Error fetching record:', error)
      setError('Failed to load medical record')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!record) return
    setSaving(true)
    setError('')

    try {
      await medicalRecordService.update(record.id, {
        title: editData.title || undefined,
        content: editData.content || undefined,
        diagnosis: editData.diagnosis || undefined,
        treatment_plan: editData.treatment_plan || undefined,
        prescriptions: editData.prescriptions || undefined,
        follow_up_date: editData.follow_up_date || undefined,
        vitals_bp: editData.vitals_bp || undefined,
        vitals_pulse: editData.vitals_pulse ? Number(editData.vitals_pulse) : undefined,
        vitals_temperature: editData.vitals_temperature ? Number(editData.vitals_temperature) : undefined,
        vitals_spo2: editData.vitals_spo2 ? Number(editData.vitals_spo2) : undefined,
        vitals_weight: editData.vitals_weight ? Number(editData.vitals_weight) : undefined,
      })
      await fetchRecord()
      setIsEditing(false)
    } catch (err) {
      setError('Failed to update record')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

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

  if (!record) {
    return (
      <div className="text-center py-16">
        <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">Medical record not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  const typeConfig = getRecordTypeConfig(record.record_type)
  const hasVitals = record.vitals_bp || record.vitals_pulse || record.vitals_temperature || record.vitals_spo2 || record.vitals_weight

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header - Not printed */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Medical Record</h1>
            <p className="text-gray-500">View and manage medical record details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && canEdit && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false)
                fetchRecord()
              }}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
          {!isEditing && (
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg print:hidden">
          {error}
        </div>
      )}

      {/* Printable Content */}
      <div ref={printRef} className="space-y-6 print:p-8">
        {/* Print Header - Only shown when printing */}
        <div className="hidden print:block mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">Medical Record</h1>
          <div className="text-center text-gray-600">
            <p className="text-lg font-medium">{record.patient?.name}</p>
            <p className="text-sm">{record.patient?.registration_number}</p>
          </div>
          <hr className="my-4" />
        </div>

        {/* Record Type & Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-16 w-16 rounded-full flex items-center justify-center ${typeConfig.color}`}>
                  {typeConfig.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold">{record.title || typeConfig.label}</h2>
                    <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(record.record_date, 'long')}
                    </span>
                    {record.doctor && (
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        Dr. {record.doctor.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Information */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            {record.patient && (
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                  {getInitials(record.patient.name)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{record.patient.name}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                    <div>
                      <span className="text-gray-500">Reg No:</span>
                      <p className="font-medium">{record.patient.registration_number}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Age/Gender:</span>
                      <p className="font-medium">{record.patient.age} years / {record.patient.gender}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Mobile:</span>
                      <p className="font-medium">{record.patient.mobile}</p>
                    </div>
                    {record.patient.blood_group && (
                      <div>
                        <span className="text-gray-500">Blood Group:</span>
                        <p className="font-medium text-red-600">{record.patient.blood_group}</p>
                      </div>
                    )}
                  </div>
                  {record.admission && (
                    <div className="mt-2">
                      <Badge variant="outline">Admission: {record.admission.admission_number}</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vitals */}
        {hasVitals && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Vital Signs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Input
                    label="Blood Pressure"
                    placeholder="120/80"
                    value={editData.vitals_bp}
                    onChange={(e) => setEditData(prev => ({ ...prev, vitals_bp: e.target.value }))}
                  />
                  <Input
                    label="Pulse (bpm)"
                    type="number"
                    placeholder="72"
                    value={editData.vitals_pulse}
                    onChange={(e) => setEditData(prev => ({ ...prev, vitals_pulse: e.target.value ? Number(e.target.value) : '' }))}
                  />
                  <Input
                    label="Temperature (°F)"
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    value={editData.vitals_temperature}
                    onChange={(e) => setEditData(prev => ({ ...prev, vitals_temperature: e.target.value ? Number(e.target.value) : '' }))}
                  />
                  <Input
                    label="SpO2 (%)"
                    type="number"
                    placeholder="98"
                    value={editData.vitals_spo2}
                    onChange={(e) => setEditData(prev => ({ ...prev, vitals_spo2: e.target.value ? Number(e.target.value) : '' }))}
                  />
                  <Input
                    label="Weight (kg)"
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={editData.vitals_weight}
                    onChange={(e) => setEditData(prev => ({ ...prev, vitals_weight: e.target.value ? Number(e.target.value) : '' }))}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {record.vitals_bp && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Blood Pressure</p>
                      <p className="text-xl font-bold text-gray-900">{record.vitals_bp}</p>
                      <p className="text-xs text-gray-500">mmHg</p>
                    </div>
                  )}
                  {record.vitals_pulse && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Pulse</p>
                      <p className="text-xl font-bold text-gray-900">{record.vitals_pulse}</p>
                      <p className="text-xs text-gray-500">bpm</p>
                    </div>
                  )}
                  {record.vitals_temperature && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Temperature</p>
                      <p className="text-xl font-bold text-gray-900">{record.vitals_temperature}</p>
                      <p className="text-xs text-gray-500">°F</p>
                    </div>
                  )}
                  {record.vitals_spo2 && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">SpO2</p>
                      <p className="text-xl font-bold text-gray-900">{record.vitals_spo2}</p>
                      <p className="text-xs text-gray-500">%</p>
                    </div>
                  )}
                  {record.vitals_weight && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Weight</p>
                      <p className="text-xl font-bold text-gray-900">{record.vitals_weight}</p>
                      <p className="text-xs text-gray-500">kg</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Medical Details */}
        <Card>
          <CardHeader>
            <CardTitle>Medical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Content/Notes */}
            {(record.content || isEditing) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {record.record_type === 'prescription' ? 'Prescription Notes' :
                   record.record_type === 'consultation' ? 'Consultation Notes' :
                   record.record_type === 'progress_note' ? 'Progress Notes' :
                   record.record_type === 'surgery_note' ? 'Surgery Details' :
                   record.record_type === 'discharge_summary' ? 'Discharge Summary' :
                   'Notes'}
                </label>
                {isEditing ? (
                  <textarea
                    className="w-full p-3 border rounded-md min-h-[150px]"
                    value={editData.content}
                    onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
                  />
                ) : (
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700">{record.content}</p>
                  </div>
                )}
              </div>
            )}

            {/* Diagnosis */}
            {(record.diagnosis || isEditing) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                {isEditing ? (
                  <textarea
                    className="w-full p-3 border rounded-md min-h-[100px]"
                    value={editData.diagnosis}
                    onChange={(e) => setEditData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  />
                ) : (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap text-gray-800">{record.diagnosis}</p>
                  </div>
                )}
              </div>
            )}

            {/* Treatment Plan */}
            {(record.treatment_plan || isEditing) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
                {isEditing ? (
                  <textarea
                    className="w-full p-3 border rounded-md min-h-[100px]"
                    value={editData.treatment_plan}
                    onChange={(e) => setEditData(prev => ({ ...prev, treatment_plan: e.target.value }))}
                  />
                ) : (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap text-gray-800">{record.treatment_plan}</p>
                  </div>
                )}
              </div>
            )}

            {/* Prescriptions */}
            {(record.prescriptions || (isEditing && record.record_type === 'prescription')) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prescriptions</label>
                {isEditing ? (
                  <textarea
                    className="w-full p-3 border rounded-md min-h-[120px] font-mono text-sm"
                    value={editData.prescriptions}
                    onChange={(e) => setEditData(prev => ({ ...prev, prescriptions: e.target.value }))}
                  />
                ) : (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap font-mono text-sm text-gray-800">{record.prescriptions}</p>
                  </div>
                )}
              </div>
            )}

            {/* Follow-up Date */}
            {(record.follow_up_date || isEditing) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Date</label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editData.follow_up_date}
                    onChange={(e) => setEditData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                  />
                ) : record.follow_up_date ? (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-gray-800 font-medium">
                      {formatDate(record.follow_up_date, 'long')}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No follow-up date set</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Attachments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Upload className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Attachment support coming soon</p>
              <p className="text-sm mt-1">Upload and manage medical documents, images, and reports</p>
            </div>
          </CardContent>
        </Card>

        {/* Print Footer */}
        <div className="hidden print:block mt-12 pt-6 border-t">
          <div className="flex justify-between text-sm text-gray-600">
            <div>
              <p>Printed on: {formatDate(new Date().toISOString(), 'long')}</p>
              {record.doctor && <p>Doctor: Dr. {record.doctor.name}</p>}
            </div>
            <div className="text-right">
              <p className="font-medium">Authorized Signature</p>
              <p className="mt-8 border-t border-gray-400 pt-1">Doctor&apos;s Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
