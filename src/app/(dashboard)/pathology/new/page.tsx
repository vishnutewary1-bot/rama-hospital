'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  patientService,
  patientTestService,
  pathologyTestService,
  pathologyCategoryService,
  doctorService
} from '@/lib/database'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Patient, PathologyTest, PathologyCategory, Doctor } from '@/types/database'
import {
  Search,
  Plus,
  Minus,
  FlaskConical,
  Loader2,
  ArrowLeft,
  User
} from 'lucide-react'
import Link from 'next/link'

export default function NewTestOrderPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [categories, setCategories] = useState<PathologyCategory[]>([])
  const [tests, setTests] = useState<PathologyTest[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])

  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [priority, setPriority] = useState<string>('routine')
  const [selectedTests, setSelectedTests] = useState<PathologyTest[]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [categoriesData, testsData, doctorsData] = await Promise.all([
        pathologyCategoryService.getAll(),
        pathologyTestService.getAll(),
        doctorService.getAll()
      ])
      setCategories(categoriesData)
      setTests(testsData)
      setDoctors(doctorsData)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  async function searchPatients(search: string) {
    if (search.length < 2) {
      setPatients([])
      return
    }
    try {
      const results = await patientService.search(search)
      setPatients(results.slice(0, 10))
    } catch (error) {
      console.error('Failed to search patients:', error)
    }
  }

  function handlePatientSearch(value: string) {
    setPatientSearch(value)
    searchPatients(value)
  }

  function selectPatient(patient: Patient) {
    setSelectedPatient(patient)
    setPatients([])
    setPatientSearch('')
  }

  function addTest(test: PathologyTest) {
    if (!selectedTests.find(t => t.id === test.id)) {
      setSelectedTests([...selectedTests, test])
    }
  }

  function removeTest(testId: string) {
    setSelectedTests(selectedTests.filter(t => t.id !== testId))
  }

  const filteredTests = selectedCategory === 'all'
    ? tests
    : tests.filter(t => t.category_id === selectedCategory)

  const totalAmount = selectedTests.reduce((sum, t) => sum + t.price, 0)

  // Generate barcode/order number
  function generateOrderNumber(): string {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `LAB${year}${month}${day}${random}`
  }

  // Generate barcode for sample
  function generateSampleBarcode(orderNumber: string, testId: string): string {
    const shortTestId = testId.slice(-4).toUpperCase()
    return `${orderNumber}-${shortTestId}`
  }

  async function handleSubmit() {
    if (!selectedPatient) {
      toast({
        title: 'Error',
        description: 'Please select a patient',
        variant: 'destructive'
      })
      return
    }

    if (selectedTests.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one test',
        variant: 'destructive'
      })
      return
    }

    try {
      setSubmitting(true)

      // Create test orders for each selected test
      const orderPromises = selectedTests.map(async (test) => {
        const orderNumber = generateOrderNumber()
        const sampleBarcode = generateSampleBarcode(orderNumber, test.id)

        return await patientTestService.create({
          patient_id: selectedPatient.id,
          test_id: test.id,
          doctor_id: selectedDoctor || undefined,
          ordered_by: user?.id || '',
          priority: priority as 'routine' | 'urgent' | 'stat',
          notes: notes,
          order_date: new Date().toISOString(),
          order_number: orderNumber,
          sample_barcode: sampleBarcode,
          sample_collected: false,
          status: 'ordered'
        })
      })

      await Promise.all(orderPromises)

      toast({
        title: 'Success',
        description: `${selectedTests.length} test order(s) created successfully`,
        variant: 'success'
      })

      router.push('/pathology')
    } catch (error) {
      console.error('Failed to create test orders:', error)
      toast({
        title: 'Error',
        description: 'Failed to create test orders',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
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
      <div className="flex items-center gap-4">
        <Link href="/pathology">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Test Order</h1>
          <p className="text-gray-500">Order lab tests for a patient</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patient & Test Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-lg">{selectedPatient.name}</p>
                    <p className="text-sm text-gray-600">
                      {selectedPatient.registration_number} | {selectedPatient.age} {selectedPatient.age_unit || 'years'} | {selectedPatient.gender}
                    </p>
                    <p className="text-sm text-gray-600">{selectedPatient.mobile}</p>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedPatient(null)}>
                    Change Patient
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search patient by name, mobile, or registration number..."
                      value={patientSearch}
                      onChange={(e) => handlePatientSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {patients.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                      {patients.map((patient) => (
                        <div
                          key={patient.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => selectPatient(patient)}
                        >
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-sm text-gray-500">
                            {patient.registration_number} | {patient.age} {patient.age_unit || 'years'} | {patient.mobile}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Select Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="border rounded-lg max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Sample</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTests.map((test) => {
                      const isSelected = selectedTests.some(t => t.id === test.id)
                      return (
                        <TableRow key={test.id} className={isSelected ? 'bg-blue-50' : ''}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{test.name}</p>
                              {test.short_name && (
                                <p className="text-xs text-gray-500">{test.short_name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {test.sample_type || '-'}
                          </TableCell>
                          <TableCell className="font-medium">Rs. {test.price}</TableCell>
                          <TableCell>
                            {isSelected ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeTest(test.id)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addTest(test)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-6">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Referring Doctor</label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        Dr. {doc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT (Emergency)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Input
                  placeholder="Any special instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Selected Tests Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Selected Tests ({selectedTests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No tests selected</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {selectedTests.map((test) => (
                      <div key={test.id} className="flex items-center justify-between py-2 border-b">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{test.name}</p>
                          <p className="text-xs text-gray-500">
                            {test.sample_type || 'N/A'} | {test.reporting_time || 'TBD'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">Rs. {test.price}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTest(test.id)}
                          >
                            <Minus className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total</span>
                      <span>Rs. {totalAmount}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={submitting || !selectedPatient || selectedTests.length === 0}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Orders...
                      </>
                    ) : (
                      <>
                        <FlaskConical className="h-4 w-4 mr-2" />
                        Create Test Order
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
