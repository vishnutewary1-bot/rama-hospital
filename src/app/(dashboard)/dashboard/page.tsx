'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { dashboardService } from '@/lib/database'
import { StatCard, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardStats } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import {
  Users,
  UserPlus,
  Receipt,
  DollarSign,
  Stethoscope,
  BedDouble,
  FlaskConical,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2,
  Plus,
  FileText,
  BarChart3
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const data = await dashboardService.getStats()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const isAdmin = user?.role === 'admin'
  const isWorker = user?.role === 'worker'
  const isBilling = user?.role === 'billing'
  const isPathology = user?.role === 'pathology'
  const isDoctor = user?.role === 'doctor'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Patients"
          value={stats?.totalPatients || 0}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Active Admissions"
          value={stats?.activeAdmissions || 0}
          icon={<UserPlus className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Today's Collection"
          value={formatCurrency(stats?.todayCollection || 0)}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Pending Amount"
          value={formatCurrency(stats?.pendingAmount || 0)}
          icon={<TrendingDown className="h-6 w-6" />}
          color="yellow"
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Available Beds"
          value={stats?.availableBeds || 0}
          icon={<BedDouble className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Occupied Beds"
          value={stats?.occupiedBeds || 0}
          icon={<BedDouble className="h-6 w-6" />}
          color="red"
        />
        <StatCard
          title="Pending Lab Tests"
          value={stats?.pendingTests || 0}
          icon={<FlaskConical className="h-6 w-6" />}
          color="purple"
        />
        {isAdmin && (
          <StatCard
            title="Today's Expenses"
            value={formatCurrency(stats?.todayExpenses || 0)}
            icon={<DollarSign className="h-6 w-6" />}
            color="red"
          />
        )}
        {!isAdmin && (
          <StatCard
            title="Total Doctors"
            value={stats?.totalDoctors || 0}
            icon={<Stethoscope className="h-6 w-6" />}
            color="indigo"
          />
        )}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(isAdmin || isWorker) && (
                <>
                  <Link href="/patients/new" className="block">
                    <Button variant="outline" className="w-full h-24 flex-col gap-2">
                      <Users className="h-6 w-6" />
                      <span className="text-sm">New Patient</span>
                    </Button>
                  </Link>
                  <Link href="/admissions/new" className="block">
                    <Button variant="outline" className="w-full h-24 flex-col gap-2">
                      <UserPlus className="h-6 w-6" />
                      <span className="text-sm">New Admission</span>
                    </Button>
                  </Link>
                </>
              )}
              {(isAdmin || isWorker || isBilling) && (
                <Link href="/billing" className="block">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2">
                    <Receipt className="h-6 w-6" />
                    <span className="text-sm">Billing</span>
                  </Button>
                </Link>
              )}
              {(isAdmin || isPathology) && (
                <Link href="/pathology/new" className="block">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2">
                    <FlaskConical className="h-6 w-6" />
                    <span className="text-sm">Order Lab Test</span>
                  </Button>
                </Link>
              )}
              {(isAdmin || isDoctor) && (
                <Link href="/medical-records" className="block">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2">
                    <FileText className="h-6 w-6" />
                    <span className="text-sm">Medical Records</span>
                  </Button>
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link href="/expenses/new" className="block">
                    <Button variant="outline" className="w-full h-24 flex-col gap-2">
                      <DollarSign className="h-6 w-6" />
                      <span className="text-sm">Add Expense</span>
                    </Button>
                  </Link>
                  <Link href="/reports" className="block">
                    <Button variant="outline" className="w-full h-24 flex-col gap-2">
                      <BarChart3 className="h-6 w-6" />
                      <span className="text-sm">Reports</span>
                    </Button>
                  </Link>
                  <Link href="/users/new" className="block">
                    <Button variant="outline" className="w-full h-24 flex-col gap-2">
                      <Plus className="h-6 w-6" />
                      <span className="text-sm">Add User</span>
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today&apos;s Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">New Admissions</span>
                <span className="font-semibold">{stats?.todayAdmissions || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Active Patients</span>
                <span className="font-semibold">{stats?.activeAdmissions || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Collection</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(stats?.todayCollection || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Pending Tests</span>
                <span className="font-semibold text-yellow-600">{stats?.pendingTests || 0}</span>
              </div>
              {isAdmin && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Expenses</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(stats?.todayExpenses || 0)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bed Occupancy Overview */}
      {(isAdmin || isWorker) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5" />
              Bed Occupancy Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{
                      width: `${stats && (stats.availableBeds + stats.occupiedBeds) > 0
                        ? (stats.occupiedBeds / (stats.availableBeds + stats.occupiedBeds)) * 100
                        : 0}%`
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                  <span>
                    {stats && (stats.availableBeds + stats.occupiedBeds) > 0
                      ? Math.round((stats.occupiedBeds / (stats.availableBeds + stats.occupiedBeds)) * 100)
                      : 0}% Occupied
                  </span>
                  <span>{(stats?.availableBeds || 0) + (stats?.occupiedBeds || 0)} Total Beds</span>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats?.availableBeds || 0}</p>
                  <p className="text-sm text-gray-500">Available</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{stats?.occupiedBeds || 0}</p>
                  <p className="text-sm text-gray-500">Occupied</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/wards">
                <Button variant="outline" size="sm">
                  View Ward Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
