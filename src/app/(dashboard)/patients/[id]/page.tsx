'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { patientService, admissionService, billService, medicalRecordService, pathologyService, auditLogService } from '@/lib/database'
import { Patient, Admission, Bill, MedicalRecord, PatientTest, AuditLog } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatCurrency, formatDate, formatRelativeTime, getInitials, calculateAge } from '@/lib/utils'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  Activity,
  FileText,
  Receipt,
  FlaskConical,
  Heart,
  Droplet,
  Edit,
  UserPlus,
  ArrowLeft,
  Camera,
  Shield,
  History,
  Stethoscope,
  Pill,
  ClipboardList,
  Loader2,
  Plus,
  Eye,
  Printer
} from 'lucide-react'

interface PatientActivity {
  id: string
  type: 'admission' | 'discharge' | 'payment' | 'test' | 'record' | 'system'
  title: string
  description?: string
  date: string
  icon: React.ReactNode
  color: string
}

export default function PatientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [admissions, setAdmissions] = useState<Admission[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([])
  const [labTests, setLabTests] = useState<PatientTest[]>([])
  const [activities, setActivities] = useState<PatientActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [editAlerts, setEditAlerts] = useState(false)
  const [editContacts, setEditContacts] = useState(false)
  const [alertsForm, setAlertsForm] = useState({ medical_alerts: '', allergies: '' })
  const [contactsForm, setContactsForm] = useState({
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: ''
  })

  const isAdmin = user?.role === 'admin'
  const isWorker = user?.role === 'worker'
  const canEdit = isAdmin || isWorker

  const fetchPatient = useCallback(async () => {
    try {
      const data = await patientService.getById(params.id as string)
      if (data) {
        setPatient(data)
        setAlertsForm({
          medical_alerts: data.medical_alerts || '',
          allergies: data.allergies || ''
        })
        setContactsForm({
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          emergency_contact_relation: data.emergency_contact_relation || ''
        })
      }
    } catch (error) {
      console.error('Error fetching patient:', error)
    }
  }, [params.id])

  const fetchAdmissions = useCallback(async () => {
    try {
      const data = await admissionService.getByPatientId(params.id as string)
      setAdmissions(data)
    } catch (error) {
      console.error('Error fetching admissions:', error)
    }
  }, [params.id])

  const fetchBills = useCallback(async () => {
    try {
      const data = await billService.getByPatientId(params.id as string)
      setBills(data)
    } catch (error) {
      console.error('Error fetching bills:', error)
    }
  }, [params.id])

  const fetchMedicalRecords = useCallback(async () => {
    try {
      const data = await medicalRecordService.getByPatientId(params.id as string)
      setMedicalRecords(data)
    } catch (error) {
      console.error('Error fetching medical records:', error)
    }
  }, [params.id])

  const fetchLabTests = useCallback(async () => {
    try {
      const data = await pathologyService.getTestsByPatientId(params.id as string)
      setLabTests(data)
    } catch (error) {
      console.error('Error fetching lab tests:', error)
    }
  }, [params.id])

  const buildActivityTimeline = useCallback(() => {
    const allActivities: PatientActivity[] = []

    // Add admissions
    admissions.forEach(admission => {
      allActivities.push({
        id: `adm-${admission.id}`,
        type: 'admission',
        title: 'Patient Admitted',
        description: `${admission.ward_type || admission.ward?.name} - ${admission.doctor?.name || 'No doctor assigned'}`,
        date: admission.admission_date,
        icon: <UserPlus className="h-4 w-4" />,
        color: 'bg-green-500'
      })

      if (admission.discharge_date) {
        allActivities.push({
          id: `dis-${admission.id}`,
          type: 'discharge',
          title: 'Patient Discharged',
          description: `Status: ${admission.status}`,
          date: admission.discharge_date,
          icon: <Activity className="h-4 w-4" />,
          color: 'bg-blue-500'
        })
      }
    })

    // Add lab tests
    labTests.forEach(test => {
      allActivities.push({
        id: `test-${test.id}`,
        type: 'test',
        title: `Lab Test: ${test.test?.name || 'Test'}`,
        description: `Status: ${test.status}`,
        date: test.order_date,
        icon: <FlaskConical className="h-4 w-4" />,
        color: 'bg-purple-500'
      })
    })

    // Add medical records
    medicalRecords.forEach(record => {
      allActivities.push({
        id: `rec-${record.id}`,
        type: 'record',
        title: record.title || record.record_type.charAt(0).toUpperCase() + record.record_type.slice(1).replace('_', ' '),
        description: record.doctor?.name ? `By Dr. ${record.doctor.name}` : undefined,
        date: record.record_date,
        icon: <FileText className="h-4 w-4" />,
        color: 'bg-orange-500'
      })
    })

    // Sort by date descending
    allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setActivities(allActivities)
  }, [admissions, labTests, medicalRecords])

  useEffect(() => {
    if (params.id) {
      Promise.all([
        fetchPatient(),
        fetchAdmissions(),
        fetchBills(),
        fetchMedicalRecords(),
        fetchLabTests()
      ]).finally(() => setLoading(false))
    }
  }, [params.id, fetchPatient, fetchAdmissions, fetchBills, fetchMedicalRecords, fetchLabTests])

  useEffect(() => {
    buildActivityTimeline()
  }, [buildActivityTimeline])

  async function handleSaveAlerts() {
    if (!patient) return
    try {
      await patientService.update(patient.id, alertsForm)
      setPatient({ ...patient, ...alertsForm })
      setEditAlerts(false)
    } catch (error) {
      console.error('Error saving alerts:', error)
    }
  }

  async function handleSaveContacts() {
    if (!patient) return
    try {
      await patientService.update(patient.id, contactsForm)
      setPatient({ ...patient, ...contactsForm })
      setEditContacts(false)
    } catch (error) {
      console.error('Error saving contacts:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 text-lg">Patient not found</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  const activeAdmission = admissions.find(a => a.status === 'Active')
  const ageInfo = patient.date_of_birth ? calculateAge(patient.date_of_birth) : null

  // Stats
  const totalBilled = bills.reduce((sum, b) => sum + b.net_amount, 0)
  const totalPaid = bills.reduce((sum, b) => sum + b.amount_received, 0)
  const totalDue = totalBilled - totalPaid

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Patient Avatar */}
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {patient.photo ? (
                <img src={patient.photo} alt={patient.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                getInitials(patient.name)
              )}
            </div>
            {canEdit && (
              <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-white shadow-md border flex items-center justify-center hover:bg-gray-50">
                <Camera className="h-3.5 w-3.5 text-gray-600" />
              </button>
            )}
            {activeAdmission && (
              <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-white" title="Currently Admitted" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
              {activeAdmission && (
                <Badge className="bg-green-100 text-green-700">Admitted</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span className="font-medium">{patient.registration_number}</span>
              <span>|</span>
              <span>{ageInfo ? `${ageInfo.age} ${ageInfo.unit}` : `${patient.age} years`}</span>
              <span>|</span>
              <span>{patient.gender}</span>
              {patient.blood_group && (
                <>
                  <span>|</span>
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <Droplet className="h-3 w-3" />
                    {patient.blood_group}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <a href={`tel:${patient.mobile}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <Phone className="h-3.5 w-3.5" />
                {patient.mobile}
              </a>
              {patient.email && (
                <a href={`mailto:${patient.email}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                  <Mail className="h-3.5 w-3.5" />
                  {patient.email}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Link href={`/patients/${patient.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {(isAdmin || isWorker) && !activeAdmission && (
            <Link href={`/admissions/new?patient=${patient.id}`}>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                New Admission
              </Button>
            </Link>
          )}
          {activeAdmission && (
            <Link href={`/admissions/${activeAdmission.id}`}>
              <Button variant="success">
                <Activity className="h-4 w-4 mr-2" />
                View Admission
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Medical Alerts Banner */}
      {(patient.medical_alerts || patient.allergies) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">Medical Alerts</h3>
              <div className="mt-1 text-sm text-red-700 space-y-1">
                {patient.medical_alerts && <p><strong>Conditions:</strong> {patient.medical_alerts}</p>}
                {patient.allergies && <p><strong>Allergies:</strong> {patient.allergies}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Admissions</p>
                <p className="text-xl font-bold">{admissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Billed</p>
                <p className="text-xl font-bold">{formatCurrency(totalBilled)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Lab Tests</p>
                <p className="text-xl font-bold">{labTests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount Due</p>
                <p className="text-xl font-bold text-yellow-600">{formatCurrency(totalDue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="records">Medical Records</TabsTrigger>
          <TabsTrigger value="lab">Lab Tests</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Full Name</dt>
                    <dd className="font-medium">{patient.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Registration No.</dt>
                    <dd className="font-medium">{patient.registration_number}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Date of Birth</dt>
                    <dd className="font-medium">
                      {patient.date_of_birth ? formatDate(patient.date_of_birth) : '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Age</dt>
                    <dd className="font-medium">
                      {ageInfo ? `${ageInfo.age} ${ageInfo.unit}` : `${patient.age} years`}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Gender</dt>
                    <dd className="font-medium">{patient.gender}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Blood Group</dt>
                    <dd className="font-medium">{patient.blood_group || '-'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Mobile</dt>
                    <dd className="font-medium">{patient.mobile}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Alternate Mobile</dt>
                    <dd className="font-medium">{patient.alternate_mobile || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Email</dt>
                    <dd className="font-medium">{patient.email || '-'}</dd>
                  </div>
                  <div className="flex justify-between items-start">
                    <dt className="text-gray-500">Address</dt>
                    <dd className="font-medium text-right max-w-[60%]">
                      {patient.address || '-'}
                      {patient.area?.name && `, ${patient.area.name}`}
                      {patient.pincode && ` - ${patient.pincode}`}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Referral</dt>
                    <dd className="font-medium">{patient.referral?.name || '-'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Emergency Contacts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Emergency Contact
                </CardTitle>
                {canEdit && (
                  <Dialog open={editContacts} onOpenChange={setEditContacts}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Emergency Contact</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          label="Contact Name"
                          value={contactsForm.emergency_contact_name}
                          onChange={(e) => setContactsForm({ ...contactsForm, emergency_contact_name: e.target.value })}
                        />
                        <Input
                          label="Contact Phone"
                          value={contactsForm.emergency_contact_phone}
                          onChange={(e) => setContactsForm({ ...contactsForm, emergency_contact_phone: e.target.value })}
                        />
                        <Input
                          label="Relation"
                          value={contactsForm.emergency_contact_relation}
                          onChange={(e) => setContactsForm({ ...contactsForm, emergency_contact_relation: e.target.value })}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditContacts(false)}>Cancel</Button>
                          <Button onClick={handleSaveContacts}>Save</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {patient.emergency_contact_name ? (
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Name</dt>
                      <dd className="font-medium">{patient.emergency_contact_name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Phone</dt>
                      <dd className="font-medium">{patient.emergency_contact_phone || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Relation</dt>
                      <dd className="font-medium">{patient.emergency_contact_relation || '-'}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-gray-500 text-sm">No emergency contact added</p>
                )}
              </CardContent>
            </Card>

            {/* Medical Alerts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Medical Alerts & Allergies
                </CardTitle>
                {canEdit && (
                  <Dialog open={editAlerts} onOpenChange={setEditAlerts}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Medical Alerts</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Medical Conditions / Alerts</label>
                          <textarea
                            className="w-full mt-1 p-2 border rounded-md"
                            rows={3}
                            placeholder="e.g., Diabetes, Hypertension, Heart condition..."
                            value={alertsForm.medical_alerts}
                            onChange={(e) => setAlertsForm({ ...alertsForm, medical_alerts: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Known Allergies</label>
                          <textarea
                            className="w-full mt-1 p-2 border rounded-md"
                            rows={3}
                            placeholder="e.g., Penicillin, Sulfa drugs, Latex..."
                            value={alertsForm.allergies}
                            onChange={(e) => setAlertsForm({ ...alertsForm, allergies: e.target.value })}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditAlerts(false)}>Cancel</Button>
                          <Button onClick={handleSaveAlerts}>Save</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-gray-500 mb-1">Medical Conditions</dt>
                    <dd className="font-medium">{patient.medical_alerts || 'None recorded'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 mb-1">Allergies</dt>
                    <dd className="font-medium text-red-600">{patient.allergies || 'None recorded'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Admissions Tab */}
        <TabsContent value="admissions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Admission History</CardTitle>
              {(isAdmin || isWorker) && !activeAdmission && (
                <Link href={`/admissions/new?patient=${patient.id}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Admission
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Ward/Bed</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No admission history
                      </TableCell>
                    </TableRow>
                  ) : (
                    admissions.map((admission) => (
                      <TableRow key={admission.id}>
                        <TableCell className="font-medium">{admission.admission_number}</TableCell>
                        <TableCell>{formatDate(admission.admission_date)}</TableCell>
                        <TableCell>
                          {admission.ward?.name || admission.ward_type}
                          {admission.bed && ` - Bed ${admission.bed.bed_number}`}
                        </TableCell>
                        <TableCell>{admission.doctor?.name || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {admission.diagnosis || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            admission.status === 'Active' ? 'default' :
                            admission.status === 'Discharged' ? 'secondary' :
                            'outline'
                          }>
                            {admission.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/admissions/${admission.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Records Tab */}
        <TabsContent value="records">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Medical Records</CardTitle>
              {canEdit && (
                <Link href={`/medical-records/new?patient=${patient.id}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Record
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {medicalRecords.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No medical records found</p>
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
                              {formatDate(record.record_date)} • {record.doctor?.name || 'Unknown'}
                            </p>
                            {record.content && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{record.content}</p>
                            )}
                          </div>
                        </div>
                        <Link href={`/medical-records/${record.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab Tests Tab */}
        <TabsContent value="lab">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lab Tests</CardTitle>
              {(isAdmin || user?.role === 'pathology') && (
                <Link href={`/pathology/new?patient=${patient.id}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Order Test
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labTests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No lab tests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    labTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium">{test.order_number}</TableCell>
                        <TableCell>{formatDate(test.order_date)}</TableCell>
                        <TableCell>{test.test?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            test.priority === 'stat' ? 'destructive' :
                            test.priority === 'urgent' ? 'default' :
                            'secondary'
                          }>
                            {test.priority.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            test.status === 'completed' || test.status === 'verified' ? 'default' :
                            test.status === 'cancelled' ? 'destructive' :
                            'outline'
                          }>
                            {test.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {(test.status === 'completed' || test.status === 'verified') && (
                              <Link href={`/pathology/${test.id}/results`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Results
                                </Button>
                              </Link>
                            )}
                            {(test.status === 'completed' || test.status === 'verified') && (
                              <Button size="sm" variant="ghost">
                                <Printer className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        No billing history
                      </TableCell>
                    </TableRow>
                  ) : (
                    bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.bill_number}</TableCell>
                        <TableCell>{formatDate(bill.bill_date)}</TableCell>
                        <TableCell>{bill.bill_type}</TableCell>
                        <TableCell className="text-right">{formatCurrency(bill.net_amount)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(bill.amount_received)}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(bill.net_amount - bill.amount_received)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            bill.status === 'Paid' ? 'default' :
                            bill.status === 'Partial' ? 'secondary' :
                            bill.status === 'Cancelled' ? 'destructive' :
                            'outline'
                          }>
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link href={`/billing/${bill.id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button size="sm" variant="ghost">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
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
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No activity yet</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-6">
                    {activities.map((activity, index) => (
                      <div key={activity.id} className="relative flex gap-4 pl-10">
                        <div className={`absolute left-2 w-5 h-5 rounded-full ${activity.color} flex items-center justify-center text-white`}>
                          {activity.icon}
                        </div>
                        <div className="flex-1 bg-white border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{activity.title}</h4>
                              {activity.description && (
                                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">{formatRelativeTime(activity.date)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
