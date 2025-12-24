'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { patientTestService, patientTestResultService } from '@/lib/database'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { PatientTest, PatientTestResult } from '@/types/database'
import {
  ArrowLeft,
  Save,
  CheckCircle,
  AlertTriangle,
  Loader2,
  User,
  FlaskConical,
  Upload,
  X,
  FileText
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface ResultEntry {
  id: string
  parameter_name: string
  unit: string
  normal_range_male: string
  normal_range_female: string
  critical_low?: number
  critical_high?: number
  value: string
  remarks: string
  is_abnormal: boolean
  is_critical: boolean
}

export default function TestResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [test, setTest] = useState<PatientTest | null>(null)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [technicianComments, setTechnicianComments] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])

  useEffect(() => {
    loadTest()
  }, [id])

  async function loadTest() {
    try {
      setLoading(true)
      const testData = await patientTestService.getById(id)
      if (!testData) {
        toast({
          title: 'Error',
          description: 'Test order not found',
          variant: 'destructive'
        })
        router.push('/pathology')
        return
      }

      setTest(testData)

      // Map results to form entries
      const resultEntries: ResultEntry[] = (testData.results || []).map((r: PatientTestResult & {
        parameter_name?: string
        unit?: string
        normal_range_male?: string
        normal_range_female?: string
        critical_low?: number
        critical_high?: number
      }) => ({
        id: r.id,
        parameter_name: r.parameter_name || '',
        unit: r.unit || '',
        normal_range_male: r.normal_range_male || '',
        normal_range_female: r.normal_range_female || '',
        critical_low: r.critical_low,
        critical_high: r.critical_high,
        value: r.value || '',
        remarks: r.remarks || '',
        is_abnormal: r.is_abnormal,
        is_critical: r.is_critical
      }))

      setResults(resultEntries)
      setTechnicianComments(testData.notes || '')
    } catch (error) {
      console.error('Failed to load test:', error)
      toast({
        title: 'Error',
        description: 'Failed to load test data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Check if value is abnormal or critical
  function checkAbnormality(value: string, result: ResultEntry, patientGender: string): { isAbnormal: boolean, isCritical: boolean } {
    if (!value || isNaN(parseFloat(value))) {
      return { isAbnormal: false, isCritical: false }
    }

    const numValue = parseFloat(value)

    // Check critical values first
    if (result.critical_low !== undefined && numValue < result.critical_low) {
      return { isAbnormal: true, isCritical: true }
    }
    if (result.critical_high !== undefined && numValue > result.critical_high) {
      return { isAbnormal: true, isCritical: true }
    }

    // Check normal range
    const normalRange = patientGender === 'Male'
      ? result.normal_range_male
      : result.normal_range_female || result.normal_range_male

    if (normalRange) {
      // Parse range like "70-110" or "< 200" or "> 60"
      const rangeMatch = normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/)
      if (rangeMatch) {
        const [, min, max] = rangeMatch
        const minVal = parseFloat(min)
        const maxVal = parseFloat(max)
        if (numValue < minVal || numValue > maxVal) {
          return { isAbnormal: true, isCritical: false }
        }
      }
    }

    return { isAbnormal: false, isCritical: false }
  }

  function updateResult(index: number, field: 'value' | 'remarks', value: string) {
    const newResults = [...results]
    const currentResult = newResults[index]

    if (field === 'value') {
      const patientGender = (test as PatientTest & { gender?: string }).gender || 'Male'
      const { isAbnormal, isCritical } = checkAbnormality(value, currentResult, patientGender)
      newResults[index] = {
        ...currentResult,
        value,
        is_abnormal: isAbnormal,
        is_critical: isCritical
      }
    } else {
      newResults[index] = { ...currentResult, [field]: value }
    }

    setResults(newResults)
  }

  async function handleSave() {
    try {
      setSaving(true)

      // Validate that at least one result has a value
      const hasResults = results.some(r => r.value)
      if (!hasResults) {
        toast({
          title: 'Validation Error',
          description: 'Please enter at least one result value',
          variant: 'destructive'
        })
        setSaving(false)
        return
      }

      // Save each result
      for (const result of results) {
        if (result.value) {
          await patientTestResultService.update(result.id, {
            value: result.value,
            remarks: result.remarks,
            is_abnormal: result.is_abnormal,
            is_critical: result.is_critical
          })
        }
      }

      // Update test status to completed
      await patientTestService.update(id, {
        status: 'completed',
        result_entered_by: user?.id,
        result_entered_at: new Date().toISOString(),
        notes: technicianComments
      })

      toast({
        title: 'Success',
        description: 'Test results saved as draft',
        variant: 'success'
      })

      router.push('/pathology')
    } catch (error) {
      console.error('Failed to save results:', error)
      toast({
        title: 'Error',
        description: 'Failed to save results',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleVerify() {
    try {
      setSaving(true)

      // Validate that all parameters have values
      const allResultsEntered = results.every(r => r.value)
      if (!allResultsEntered) {
        const confirm = window.confirm(
          'Not all parameters have values entered. Do you still want to verify this test?'
        )
        if (!confirm) {
          setSaving(false)
          return
        }
      }

      // Save results first
      for (const result of results) {
        if (result.value) {
          await patientTestResultService.update(result.id, {
            value: result.value,
            remarks: result.remarks,
            is_abnormal: result.is_abnormal,
            is_critical: result.is_critical
          })
        }
      }

      // Update test status to verified
      await patientTestService.update(id, {
        status: 'verified',
        verified_by: user?.id,
        verified_at: new Date().toISOString(),
        result_entered_by: user?.id,
        result_entered_at: new Date().toISOString(),
        notes: technicianComments
      })

      toast({
        title: 'Success',
        description: 'Test results verified and finalized',
        variant: 'success'
      })

      router.push('/pathology')
    } catch (error) {
      console.error('Failed to verify results:', error)
      toast({
        title: 'Error',
        description: 'Failed to verify results',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!test) {
    return null
  }

  const patientGender = (test as PatientTest & { gender?: string }).gender || 'Male'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/pathology">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enter Test Results</h1>
            <p className="text-gray-500">Order #{test.order_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={handleVerify} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Verify & Finalize
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Results Entry */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                {(test as PatientTest & { test_name?: string }).test_name} - Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No parameters defined for this test
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Normal Range</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">
                          {result.parameter_name}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={result.value}
                            onChange={(e) => updateResult(index, 'value', e.target.value)}
                            placeholder="Enter value"
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {result.unit || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {patientGender === 'Male'
                            ? result.normal_range_male
                            : result.normal_range_female || result.normal_range_male || '-'}
                        </TableCell>
                        <TableCell>
                          {result.value && (
                            result.is_critical ? (
                              <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                <AlertTriangle className="h-3 w-3" />
                                Critical
                              </Badge>
                            ) : result.is_abnormal ? (
                              <Badge variant="warning" className="flex items-center gap-1 w-fit">
                                Abnormal
                              </Badge>
                            ) : (
                              <Badge variant="success" className="w-fit">
                                Normal
                              </Badge>
                            )
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={result.remarks}
                            onChange={(e) => updateResult(index, 'remarks', e.target.value)}
                            placeholder="Remarks"
                            className="w-40"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Technician Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Technician Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter any observations, comments, or notes about the test..."
                value={technicianComments}
                onChange={(e) => setTechnicianComments(e.target.value)}
                rows={4}
                className="w-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Patient Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Patient Name</p>
                <p className="font-medium">{(test as PatientTest & { patient_name?: string }).patient_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Registration #</p>
                <p className="font-medium">{(test as PatientTest & { registration_number?: string }).registration_number}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="font-medium">{(test as PatientTest & { age?: number }).age} years</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium">{patientGender}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Referred By</p>
                <p className="font-medium">
                  {(test as PatientTest & { doctor_name?: string }).doctor_name ? `Dr. ${(test as PatientTest & { doctor_name?: string }).doctor_name}` : '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Results Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Results Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Total Parameters</p>
                  <p className="text-xl font-bold text-gray-900">{results.length}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500">Normal</p>
                  <p className="text-xl font-bold text-green-600">
                    {results.filter(r => r.value && !r.is_abnormal).length}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-gray-500">Abnormal</p>
                  <p className="text-xl font-bold text-orange-600">
                    {results.filter(r => r.is_abnormal && !r.is_critical).length}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-gray-500">Critical</p>
                  <p className="text-xl font-bold text-red-600">
                    {results.filter(r => r.is_critical).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Order #</p>
                <p className="font-medium">{test.order_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Barcode</p>
                <p className="font-mono text-sm font-medium">{test.sample_barcode || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Date</p>
                <p className="font-medium">{new Date(test.order_date).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Priority</p>
                <Badge variant={
                  test.priority === 'stat' ? 'destructive' :
                  test.priority === 'urgent' ? 'warning' : 'secondary'
                }>
                  {test.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sample Collected</p>
                <p className="font-medium">
                  {test.sample_collected_at
                    ? new Date(test.sample_collected_at).toLocaleString()
                    : 'Not collected'}
                </p>
              </div>
              {test.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-sm">{test.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
