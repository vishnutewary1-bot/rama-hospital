'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { patientTestService, pathologyTestService } from '@/lib/database'
import { PatientTest, PathologyTest, TestStatus } from '@/types/database'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Search,
  FlaskConical,
  TestTube,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  FileText
} from 'lucide-react'

const statusColors: Record<string, string> = {
  ordered: 'bg-blue-100 text-blue-800',
  sample_collected: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  verified: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
}

const priorityColors: Record<string, string> = {
  routine: 'bg-gray-100 text-gray-800',
  urgent: 'bg-orange-100 text-orange-800',
  stat: 'bg-red-100 text-red-800',
}

export default function PathologyPage() {
  const [tests, setTests] = useState<PatientTest[]>([])
  const [testCatalog, setTestCatalog] = useState<PathologyTest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('orders')
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [statusFilter])

  async function loadData() {
    try {
      setLoading(true)
      const [testsData, catalogData] = await Promise.all([
        patientTestService.getAll(),
        pathologyTestService.getAll()
      ])
      setTests(testsData)
      setTestCatalog(catalogData)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load pathology data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  async function updateTestStatus(testId: string, newStatus: string) {
    try {
      await patientTestService.update(testId, { status: newStatus as TestStatus })
      await loadData()
      toast({
        title: 'Success',
        description: `Test status updated to ${newStatus.replace('_', ' ')}`,
        variant: 'success'
      })
    } catch (error) {
      console.error('Failed to update status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update test status',
        variant: 'destructive'
      })
    }
  }

  const filteredTests = tests.filter(test => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      (test as PatientTest & { patient_name?: string }).patient_name?.toLowerCase().includes(searchLower) ||
      (test as PatientTest & { registration_number?: string }).registration_number?.toLowerCase().includes(searchLower) ||
      test.order_number.toLowerCase().includes(searchLower) ||
      (test as PatientTest & { test_name?: string }).test_name?.toLowerCase().includes(searchLower)
    )
  })

  const stats = {
    pending: tests.filter(t => t.status === 'ordered').length,
    samplePending: tests.filter(t => t.status === 'sample_collected').length,
    processing: tests.filter(t => t.status === 'processing').length,
    completed: tests.filter(t => t.status === 'completed' || t.status === 'verified').length,
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
          <h1 className="text-2xl font-bold text-gray-900">Pathology / Lab Management</h1>
          <p className="text-gray-500">Manage lab tests, samples, and results</p>
        </div>
        <Link href="/pathology/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Test Order
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Orders</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <TestTube className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sample Collected</p>
                <p className="text-2xl font-bold">{stats.samplePending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <FlaskConical className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Processing</p>
                <p className="text-2xl font-bold">{stats.processing}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed Today</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">Test Orders</TabsTrigger>
          <TabsTrigger value="catalog">Test Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by patient, order number, or test..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ordered">Pending Sample</SelectItem>
                    <SelectItem value="sample_collected">Sample Collected</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Test Orders Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No test orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium">{test.order_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{(test as PatientTest & { patient_name?: string }).patient_name}</p>
                            <p className="text-sm text-gray-500">{(test as PatientTest & { registration_number?: string }).registration_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>{(test as PatientTest & { test_name?: string }).test_name}</TableCell>
                        <TableCell>
                          <Badge className={priorityColors[test.priority]}>
                            {test.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(test.order_date)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[test.status]}>
                            {test.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {test.status === 'ordered' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTestStatus(test.id, 'sample_collected')}
                              >
                                <TestTube className="h-4 w-4 mr-1" />
                                Collect Sample
                              </Button>
                            )}
                            {test.status === 'sample_collected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTestStatus(test.id, 'processing')}
                              >
                                <FlaskConical className="h-4 w-4 mr-1" />
                                Start Processing
                              </Button>
                            )}
                            {test.status === 'processing' && (
                              <Link href={`/pathology/${test.id}/results`}>
                                <Button size="sm" variant="outline">
                                  <ClipboardCheck className="h-4 w-4 mr-1" />
                                  Enter Results
                                </Button>
                              </Link>
                            )}
                            {(test.status === 'completed' || test.status === 'verified') && (
                              <Link href={`/pathology/${test.id}`}>
                                <Button size="sm" variant="outline">
                                  <FileText className="h-4 w-4 mr-1" />
                                  View Report
                                </Button>
                              </Link>
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

        <TabsContent value="catalog" className="space-y-4">
          {/* Test Catalog */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Available Tests</CardTitle>
                <Link href="/pathology/tests/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Test
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sample Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>TAT</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCatalog.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{test.name}</p>
                          {test.short_name && (
                            <p className="text-sm text-gray-500">{test.short_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{(test as PathologyTest & { category_name?: string }).category_name}</TableCell>
                      <TableCell>{test.sample_type || '-'}</TableCell>
                      <TableCell className="font-medium">Rs. {test.price}</TableCell>
                      <TableCell>{test.reporting_time || '-'}</TableCell>
                      <TableCell>
                        <Link href={`/pathology/tests/${test.id}`}>
                          <Button size="sm" variant="ghost">
                            Edit
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
