'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { formatDate, formatRelativeTime, getInitials } from '@/lib/utils'
import {
  Clock,
  Users,
  Activity,
  CheckCircle,
  AlertCircle,
  User,
  Stethoscope,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react'

interface QueueItem {
  id: string
  registration_number: string
  token_number: string
  patient_id: string
  doctor_id: string
  visit_type: string
  visit_reason: string
  status: 'Waiting' | 'In-Consultation' | 'Completed' | 'Cancelled'
  checked_in_at: string
  consultation_started_at?: string
  waiting_time_minutes?: number
  patient_name: string
  patient_age: number
  patient_gender: string
  patient_mobile: string
  doctor_name: string
  doctor_specialization: string
}

export default function OPDQueuePage() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [doctorFilter, setDoctorFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [doctors, setDoctors] = useState<any[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchDoctors()
    fetchQueue()

    // Auto-refresh every 30 seconds
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchQueue()
      }, 30000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [doctorFilter, statusFilter, autoRefresh])

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

  async function fetchQueue() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (doctorFilter) params.append('doctor_id', doctorFilter)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/opd/queue?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setQueueItems(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching queue:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const response = await fetch(`/api/opd/registrations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          ...(status === 'In-Consultation' && {
            consultation_started_at: new Date().toISOString()
          })
        }),
      })

      if (response.ok) {
        fetchQueue()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const stats = {
    total: queueItems.length,
    waiting: queueItems.filter(q => q.status === 'Waiting').length,
    inConsultation: queueItems.filter(q => q.status === 'In-Consultation').length,
    completed: queueItems.filter(q => q.status === 'Completed').length,
  }

  const waitingQueue = queueItems.filter(q => q.status === 'Waiting')
  const inConsultationQueue = queueItems.filter(q => q.status === 'In-Consultation')
  const completedQueue = queueItems.filter(q => q.status === 'Completed')

  function getStatusColor(status: string) {
    switch (status) {
      case 'Waiting':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'In-Consultation':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'Cancelled':
        return 'bg-red-100 text-red-700 border-red-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  function getWaitingTimeColor(minutes?: number) {
    if (!minutes) return 'text-gray-500'
    if (minutes < 15) return 'text-green-600'
    if (minutes < 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading && queueItems.length === 0) {
    return <div className="text-center py-8">Loading queue...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">OPD Queue Management</h1>
          <p className="text-gray-500 mt-1">Real-time patient queue and status tracking</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Link href="/opd/registrations/new">
            <Button>+ New Registration</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total in Queue</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Waiting</p>
              <p className="text-3xl font-bold text-yellow-900 mt-1">{stats.waiting}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">In Consultation</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{stats.inConsultation}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Completed</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{stats.completed}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="w-64">
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

        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="Waiting">Waiting</SelectItem>
              <SelectItem value="In-Consultation">In Consultation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting Queue */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-800">Waiting ({waitingQueue.length})</h2>
          </div>
          <div className="space-y-3">
            {waitingQueue.length === 0 ? (
              <Card className="p-6 text-center text-gray-500">
                No patients waiting
              </Card>
            ) : (
              waitingQueue.map((item) => (
                <Card key={item.id} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-yellow-500">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xl font-bold">
                        {item.token_number}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{item.patient_name}</p>
                        <p className="text-sm text-gray-500">
                          {item.patient_age}Y / {item.patient_gender.charAt(0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Stethoscope className="h-4 w-4" />
                      <span>Dr. {item.doctor_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className={`h-4 w-4 ${getWaitingTimeColor(item.waiting_time_minutes)}`} />
                      <span className={getWaitingTimeColor(item.waiting_time_minutes)}>
                        Waiting: {item.waiting_time_minutes || 0} mins
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3 truncate">
                    {item.visit_reason}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/opd/consultations/new?opd_id=${item.id}`} className="flex-1">
                      <Button size="sm" className="w-full">
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Start
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(item.id, 'Cancelled')}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* In Consultation */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-800">In Consultation ({inConsultationQueue.length})</h2>
          </div>
          <div className="space-y-3">
            {inConsultationQueue.length === 0 ? (
              <Card className="p-6 text-center text-gray-500">
                No active consultations
              </Card>
            ) : (
              inConsultationQueue.map((item) => (
                <Card key={item.id} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-purple-500 bg-purple-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-purple-600 text-white flex items-center justify-center text-xl font-bold">
                        {item.token_number}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{item.patient_name}</p>
                        <p className="text-sm text-gray-600">
                          {item.patient_age}Y / {item.patient_gender.charAt(0)}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-purple-200 text-purple-700 text-xs font-medium rounded animate-pulse">
                      Active
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Stethoscope className="h-4 w-4" />
                      <span className="font-medium">Dr. {item.doctor_name}</span>
                    </div>
                    {item.consultation_started_at && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Started: {formatRelativeTime(item.consultation_started_at)}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-600 mb-3 truncate">
                    {item.visit_reason}
                  </div>

                  <Link href={`/opd/consultations/new?opd_id=${item.id}`}>
                    <Button size="sm" variant="outline" className="w-full">
                      Continue
                    </Button>
                  </Link>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Completed */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">Completed ({completedQueue.length})</h2>
          </div>
          <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
            {completedQueue.length === 0 ? (
              <Card className="p-6 text-center text-gray-500">
                No completed consultations
              </Card>
            ) : (
              completedQueue.map((item) => (
                <Card key={item.id} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-green-500 bg-green-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-lg font-bold">
                        {item.token_number}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{item.patient_name}</p>
                        <p className="text-xs text-gray-500">
                          {item.patient_age}Y / {item.patient_gender.charAt(0)}
                        </p>
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>

                  <div className="text-xs text-gray-600 mb-2">
                    <p className="truncate">Dr. {item.doctor_name}</p>
                  </div>

                  <Link href={`/opd/consultations?opd_id=${item.id}`}>
                    <Button size="sm" variant="ghost" className="w-full text-xs">
                      View Details
                    </Button>
                  </Link>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
