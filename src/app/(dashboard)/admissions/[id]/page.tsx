'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Admission, Bill, BillItem, Payment, MedicalRecord } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import {
  User,
  Phone,
  Calendar,
  BedDouble,
  Stethoscope,
  AlertTriangle,
  Activity,
  FileText,
  Receipt,
  CreditCard,
  DoorOpen,
  Plus,
  Edit,
  Printer,
  ArrowLeft,
  Loader2,
  Check,
  Heart,
  Droplet,
  Shield,
  ClipboardList,
  Pill,
  Scale,
  Thermometer,
  Download,
  X,
} from 'lucide-react'

export default function AdmissionDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [admission, setAdmission] = useState<Admission | null>(null)
  const [bill, setBill] = useState<Bill | null>(null)
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')

  // Discharge Modal
  const [dischargeModal, setDischargeModal] = useState(false)
  const [discharging, setDischarging] = useState(false)
  const [dischargeData, setDischargeData] = useState({
    status: 'Discharged' as 'Discharged' | 'LAMA' | 'Transferred' | 'Deceased',
    discharge_summary: '',
  })

  // Checklist for discharge
  const [dischargeChecklist, setDischargeChecklist] = useState({
    billsSettled: false,
    medicationsGiven: false,
    followUpScheduled: false,
    dischargeSummaryPrepared: false,
    patientEducated: false
  })

  const isAdmin = user?.role === 'admin'
  const isWorker = user?.role === 'worker'
  const canEdit = isAdmin || isWorker

  const fetchAdmission = useCallback(async () => {
    try {
      const response = await fetch(`/api/admissions/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch admission')
      const data = await response.json()
      setAdmission(data.data)
    } catch (error) {
      console.error('Error fetching admission:', error)
    }
  }, [params.id])

  const fetchBill = useCallback(async () => {
    try {
      const response = await fetch(`/api/bills?admission_id=${params.id}`)
      if (!response.ok) return
      const data = await response.json()
      if (data.data && data.data.length > 0) {
        const billData = data.data[0]
        setBill(billData)

        const [itemsRes, paymentsRes] = await Promise.all([
          fetch(`/api/bills/${billData.id}/items`),
          fetch(`/api/bills/${billData.id}/payments`)
        ])

        const itemsData = await itemsRes.json()
        const paymentsData = await paymentsRes.json()

        setBillItems(itemsData.data || [])
        setPayments(paymentsData.data || [])
      }
    } catch (error) {
      console.error('Error fetching bill:', error)
    }
  }, [params.id])

  const fetchMedicalRecords = useCallback(async () => {
    try {
      const response = await fetch(`/api/medical-records?admission_id=${params.id}`)
      if (!response.ok) return
      const data = await response.json()
      setMedicalRecords(data.data || [])
    } catch (error) {
      console.error('Error fetching medical records:', error)
    }
  }, [params.id])

  useEffect(() => {
    if (params.id) {
      Promise.all([fetchAdmission(), fetchBill(), fetchMedicalRecords()])
        .finally(() => setLoading(false))
    }
  }, [params.id, fetchAdmission, fetchBill, fetchMedicalRecords])

  async function handleDischarge() {
    if (!admission) return
    setDischarging(true)

    try {
      const response = await fetch(`/api/admissions/${admission.id}/discharge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dischargeData),
      })

      if (!response.ok) throw new Error('Failed to discharge patient')

      setDischargeModal(false)
      await fetchAdmission()
    } catch (error) {
      console.error('Error discharging:', error)
      alert('Failed to discharge patient. Please try again.')
    } finally {
      setDischarging(false)
    }
  }

  async function handlePrintAdmissionSlip() {
    if (!admission) return
    try {
      const response = await fetch(`/api/admissions/${admission.id}/print`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `admission-${admission.admission_number}.pdf`
      a.click()
    } catch (error) {
      console.error('Error printing admission slip:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!admission) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 text-lg">Admission not found</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  const daysAdmitted = Math.ceil(
    (new Date().getTime() - new Date(admission.admission_date).getTime()) / (1000 * 60 * 60 * 24)
  )

  const pendingAmount = (bill?.net_amount || 0) - (bill?.amount_received || 0)
  const allChecklistComplete = Object.values(dischargeChecklist).every(v => v)
  const dailyRoomRent = (admission.ward?.daily_rate || 0) + (admission.ward?.nursing_charge || 0)
  const totalRoomRent = dailyRoomRent * daysAdmitted

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{admission.admission_number}</h1>
              <Badge variant={
                admission.status === 'Active' ? 'default' :
                admission.status === 'Discharged' ? 'secondary' :
                admission.status === 'LAMA' ? 'outline' :
                'destructive'
              }>
                {admission.status}
              </Badge>
              {admission.is_mlc && (
                <Badge variant="destructive">MLC</Badge>
              )}
              {admission.has_insurance && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Insurance</Badge>
              )}
            </div>
            <p className="text-gray-500 mt-1">
              Admitted on {formatDate(admission.admission_date)} • {daysAdmitted} days
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {admission.status === 'Active' && canEdit && (
            <>
              <Link href={`/billing/${admission.id}`}>
                <Button variant="outline" size="sm">
                  <Receipt className="h-4 w-4 mr-2" />
                  Add Services
                </Button>
              </Link>
              <Button variant="destructive" size="sm" onClick={() => setDischargeModal(true)}>
                <DoorOpen className="h-4 w-4 mr-2" />
                Discharge
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={handlePrintAdmissionSlip}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Patient Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-lg">
              {admission.patient?.photo ? (
                <img src={admission.patient.photo} alt={admission.patient.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                getInitials(admission.patient?.name || 'P')
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Link href={`/patients/${admission.patient_id}`}>
                  <h2 className="text-xl font-semibold text-blue-900 hover:underline">
                    {admission.patient?.name}
                  </h2>
                </Link>
                {admission.patient?.blood_group && (
                  <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                    <Droplet className="h-3 w-3 mr-1" />
                    {admission.patient.blood_group}
                  </Badge>
                )}
              </div>
              <p className="text-gray-600">
                {admission.patient?.registration_number} • {admission.patient?.age} years • {admission.patient?.gender}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {admission.patient?.mobile}
                </span>
                <span className="flex items-center gap-1">
                  <BedDouble className="h-3.5 w-3.5" />
                  {admission.ward?.name || admission.ward_type}
                  {admission.bed && ` - Bed ${admission.bed.bed_number}`}
                </span>
                {admission.doctor && (
                  <span className="flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5" />
                    Dr. {admission.doctor.name}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Room Rent</p>
              <p className="text-lg font-bold text-gray-900">₹{dailyRoomRent}/day</p>
              <p className="text-sm text-blue-600">Total: ₹{totalRoomRent.toLocaleString()}</p>
              {pendingAmount > 0 && (
                <p className="text-sm text-red-600 mt-1">Pending: {formatCurrency(pendingAmount)}</p>
              )}
            </div>
          </div>

          {/* Medical Alerts */}
          {(admission.patient?.medical_alerts || admission.patient?.allergies) && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="text-sm">
                  {admission.patient.medical_alerts && (
                    <p className="text-red-700"><strong>Alerts:</strong> {admission.patient.medical_alerts}</p>
                  )}
                  {admission.patient.allergies && (
                    <p className="text-red-700"><strong>Allergies:</strong> {admission.patient.allergies}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="records">Medical Records</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Admission Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Admission Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Admission Date</dt>
                    <dd className="font-medium">{formatDate(admission.admission_date, 'long')}</dd>
                  </div>
                  {admission.discharge_date && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Discharge Date</dt>
                      <dd className="font-medium">{formatDate(admission.discharge_date, 'long')}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Days Admitted</dt>
                    <dd className="font-medium">{daysAdmitted}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Ward</dt>
                    <dd className="font-medium">{admission.ward?.name || admission.ward_type}</dd>
                  </div>
                  {admission.bed && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Bed</dt>
                      <dd className="font-medium">{admission.bed.bed_number}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Doctor</dt>
                    <dd className="font-medium">{admission.doctor?.name || 'Not assigned'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Diagnosis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-4 w-4" />
                  Diagnosis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {admission.chief_complaints && (
                    <div>
                      <dt className="text-gray-500 mb-1">Chief Complaints</dt>
                      <dd className="font-medium">{admission.chief_complaints}</dd>
                    </div>
                  )}
                  {admission.diagnosis && (
                    <div>
                      <dt className="text-gray-500 mb-1">Diagnosis</dt>
                      <dd className="font-medium">{admission.diagnosis}</dd>
                    </div>
                  )}
                  {!admission.chief_complaints && !admission.diagnosis && (
                    <p className="text-gray-400 italic">No diagnosis recorded</p>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Caretaker */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  Caretaker Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Name</dt>
                    <dd className="font-medium">{admission.caretaker_name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Mobile</dt>
                    <dd className="font-medium">{admission.caretaker_mobile}</dd>
                  </div>
                  {admission.caretaker_relation && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Relation</dt>
                      <dd className="font-medium">{admission.caretaker_relation}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* MLC Info */}
            {admission.is_mlc && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    MLC Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    {admission.mlc_number && (
                      <div className="flex justify-between">
                        <dt className="text-red-600">MLC Number</dt>
                        <dd className="font-medium">{admission.mlc_number}</dd>
                      </div>
                    )}
                    {admission.police_station && (
                      <div className="flex justify-between">
                        <dt className="text-red-600">Police Station</dt>
                        <dd className="font-medium">{admission.police_station}</dd>
                      </div>
                    )}
                    {admission.brought_by && (
                      <div className="flex justify-between">
                        <dt className="text-red-600">Brought By</dt>
                        <dd className="font-medium">{admission.brought_by}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Insurance Info */}
            {admission.has_insurance && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-green-800">
                    <CreditCard className="h-4 w-4" />
                    Insurance Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    {admission.insurance_company && (
                      <div className="flex justify-between">
                        <dt className="text-green-600">Company</dt>
                        <dd className="font-medium">{admission.insurance_company}</dd>
                      </div>
                    )}
                    {admission.insurance_policy_number && (
                      <div className="flex justify-between">
                        <dt className="text-green-600">Policy No.</dt>
                        <dd className="font-medium">{admission.insurance_policy_number}</dd>
                      </div>
                    )}
                    {admission.insurance_amount && (
                      <div className="flex justify-between">
                        <dt className="text-green-600">Coverage</dt>
                        <dd className="font-medium">{formatCurrency(admission.insurance_amount)}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Vitals Tab */}
        <TabsContent value="vitals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vital Signs</CardTitle>
              {admission.status === 'Active' && canEdit && (
                <Link href={`/medical-records/new?admission=${admission.id}&type=vitals`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Vitals
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {/* Admission Vitals */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Admission Vitals</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Activity className="h-5 w-5 mx-auto text-red-500 mb-2" />
                    <p className="text-sm text-gray-500">Blood Pressure</p>
                    <p className="text-lg font-semibold">{admission.vitals_bp || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Heart className="h-5 w-5 mx-auto text-pink-500 mb-2" />
                    <p className="text-sm text-gray-500">Pulse</p>
                    <p className="text-lg font-semibold">{admission.vitals_pulse ? `${admission.vitals_pulse} bpm` : '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Thermometer className="h-5 w-5 mx-auto text-orange-500 mb-2" />
                    <p className="text-sm text-gray-500">Temperature</p>
                    <p className="text-lg font-semibold">{admission.vitals_temperature ? `${admission.vitals_temperature}°F` : '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Activity className="h-5 w-5 mx-auto text-blue-500 mb-2" />
                    <p className="text-sm text-gray-500">SpO2</p>
                    <p className="text-lg font-semibold">{admission.vitals_spo2 ? `${admission.vitals_spo2}%` : '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Scale className="h-5 w-5 mx-auto text-green-500 mb-2" />
                    <p className="text-sm text-gray-500">Weight</p>
                    <p className="text-lg font-semibold">{admission.vitals_weight ? `${admission.vitals_weight} kg` : '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <User className="h-5 w-5 mx-auto text-purple-500 mb-2" />
                    <p className="text-sm text-gray-500">Height</p>
                    <p className="text-lg font-semibold">{admission.vitals_height ? `${admission.vitals_height} cm` : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Vitals History */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-4">Vitals History</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>BP</TableHead>
                      <TableHead>Pulse</TableHead>
                      <TableHead>Temp</TableHead>
                      <TableHead>SpO2</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Recorded By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicalRecords.filter(r => r.vitals_bp || r.vitals_pulse).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                          No vitals recorded yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      medicalRecords
                        .filter(r => r.vitals_bp || r.vitals_pulse)
                        .map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{formatDate(record.record_date, 'long')}</TableCell>
                            <TableCell>{record.vitals_bp || '-'}</TableCell>
                            <TableCell>{record.vitals_pulse || '-'}</TableCell>
                            <TableCell>{record.vitals_temperature ? `${record.vitals_temperature}°F` : '-'}</TableCell>
                            <TableCell>{record.vitals_spo2 ? `${record.vitals_spo2}%` : '-'}</TableCell>
                            <TableCell>{record.vitals_weight ? `${record.vitals_weight} kg` : '-'}</TableCell>
                            <TableCell>{record.doctor?.name || '-'}</TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Records Tab */}
        <TabsContent value="records">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Medical Records</CardTitle>
              {admission.status === 'Active' && canEdit && (
                <Link href={`/medical-records/new?admission=${admission.id}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Record
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {medicalRecords.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No medical records yet</p>
              ) : (
                <div className="space-y-4">
                  {medicalRecords.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            record.record_type === 'consultation' ? 'bg-blue-100 text-blue-600' :
                            record.record_type === 'prescription' ? 'bg-green-100 text-green-600' :
                            record.record_type === 'progress_note' ? 'bg-yellow-100 text-yellow-600' :
                            record.record_type === 'surgery_note' ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {record.record_type === 'consultation' && <Stethoscope className="h-5 w-5" />}
                            {record.record_type === 'prescription' && <Pill className="h-5 w-5" />}
                            {record.record_type === 'progress_note' && <ClipboardList className="h-5 w-5" />}
                            {record.record_type === 'surgery_note' && <Heart className="h-5 w-5" />}
                            {!['consultation', 'prescription', 'progress_note', 'surgery_note'].includes(record.record_type) && <FileText className="h-5 w-5" />}
                          </div>
                          <div>
                            <h4 className="font-medium">{record.title || record.record_type.replace('_', ' ').toUpperCase()}</h4>
                            <p className="text-sm text-gray-500">
                              {formatDate(record.record_date, 'long')} • {record.doctor?.name || 'Unknown'}
                            </p>
                            {record.content && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{record.content}</p>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bill Items</CardTitle>
              {admission.status === 'Active' && canEdit && (
                <Link href={`/billing/${admission.id}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No services added yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    billItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.service_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total_amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {bill && (
                <div className="mt-6 border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">{formatCurrency(bill.total_amount)}</span>
                  </div>
                  {bill.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(bill.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Amount</span>
                    <span>{formatCurrency(bill.net_amount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Amount Received</span>
                    <span>{formatCurrency(bill.amount_received)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>Pending</span>
                    <span>{formatCurrency(pendingAmount)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment History</CardTitle>
              {pendingAmount > 0 && canEdit && (
                <Link href={`/payments/new?bill=${bill?.id}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Receive Payment
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No payments received yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.payment_number}</TableCell>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.payment_mode}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>{payment.transaction_reference || '-'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Timeline of Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Admission Event */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Check className="h-5 w-5" />
                    </div>
                    {!admission.discharge_date && <div className="w-0.5 h-full bg-blue-200 mt-2" />}
                  </div>
                  <div className="flex-1 pb-8">
                    <h4 className="font-medium">Patient Admitted</h4>
                    <p className="text-sm text-gray-500">{formatDate(admission.admission_date, 'long')}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Ward: {admission.ward?.name}, Bed: {admission.bed?.bed_number}
                    </p>
                  </div>
                </div>

                {/* Medical Records Events */}
                {medicalRecords.map((record, index) => (
                  <div key={record.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        record.record_type === 'consultation' ? 'bg-blue-100 text-blue-600' :
                        record.record_type === 'prescription' ? 'bg-green-100 text-green-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      {index < medicalRecords.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-2" />}
                    </div>
                    <div className="flex-1 pb-8">
                      <h4 className="font-medium">{record.title || record.record_type.replace('_', ' ')}</h4>
                      <p className="text-sm text-gray-500">
                        {formatDate(record.record_date, 'long')} • {record.doctor?.name}
                      </p>
                      {record.content && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{record.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Discharge Event */}
                {admission.discharge_date && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                        <DoorOpen className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Patient Discharged</h4>
                      <p className="text-sm text-gray-500">{formatDate(admission.discharge_date, 'long')}</p>
                      <p className="text-sm text-gray-600 mt-1">Status: {admission.status}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Discharge Modal */}
      <Dialog open={dischargeModal} onOpenChange={setDischargeModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Discharge Patient</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Patient Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="font-medium">{admission.patient?.name}</p>
              <p className="text-sm text-gray-600">
                {admission.admission_number} • {daysAdmitted} days admitted
              </p>
            </div>

            {/* Pending Bill Warning */}
            {pendingAmount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Pending Amount</p>
                    <p className="text-sm text-yellow-700">
                      There is a pending amount of {formatCurrency(pendingAmount)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Discharge Status */}
            <div>
              <label className="block text-sm font-medium mb-2">Discharge Status</label>
              <div className="grid grid-cols-4 gap-2">
                {(['Discharged', 'LAMA', 'Transferred', 'Deceased'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setDischargeData({ ...dischargeData, status })}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      dischargeData.status === status
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Discharge Checklist */}
            <div>
              <label className="block text-sm font-medium mb-2">Discharge Checklist</label>
              <div className="space-y-2">
                {[
                  { key: 'billsSettled', label: 'All bills settled or payment plan arranged' },
                  { key: 'medicationsGiven', label: 'Discharge medications provided' },
                  { key: 'followUpScheduled', label: 'Follow-up appointment scheduled' },
                  { key: 'dischargeSummaryPrepared', label: 'Discharge summary prepared' },
                  { key: 'patientEducated', label: 'Patient/caretaker educated on home care' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dischargeChecklist[key as keyof typeof dischargeChecklist]}
                      onChange={(e) => setDischargeChecklist({
                        ...dischargeChecklist,
                        [key]: e.target.checked
                      })}
                      className="h-5 w-5 rounded border-gray-300"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Discharge Summary */}
            <div>
              <label className="block text-sm font-medium mb-2">Discharge Summary</label>
              <textarea
                className="w-full p-3 border rounded-md"
                rows={4}
                placeholder="Enter discharge summary, instructions, follow-up advice..."
                value={dischargeData.discharge_summary}
                onChange={(e) => setDischargeData({ ...dischargeData, discharge_summary: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDischargeModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDischarge}
              disabled={discharging || !allChecklistComplete}
            >
              {discharging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <DoorOpen className="h-4 w-4 mr-2" />
                  Confirm Discharge
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
