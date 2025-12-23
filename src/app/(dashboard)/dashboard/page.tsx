'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { StatCard, Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  activePatients: number
  todayAdmissions: number
  todayCollection: number
  pendingAmount: number
  totalDoctors: number
  todayExpenses: number
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    activePatients: 0,
    todayAdmissions: 0,
    todayCollection: 0,
    pendingAmount: 0,
    totalDoctors: 0,
    todayExpenses: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Active admissions
      const { count: activePatients } = await supabase
        .from('admissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active')

      // Today's admissions
      const { count: todayAdmissions } = await supabase
        .from('admissions')
        .select('*', { count: 'exact', head: true })
        .gte('admission_date', today)

      // Today's collection
      const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', today)

      const todayCollection = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

      // Pending amount
      const { data: pendingBills } = await supabase
        .from('bills')
        .select('net_amount, amount_received')
        .in('status', ['Draft', 'Partial'])

      const pendingAmount = pendingBills?.reduce(
        (sum, b) => sum + (Number(b.net_amount) - Number(b.amount_received)),
        0
      ) || 0

      // Total doctors
      const { count: totalDoctors } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Today's expenses (admin only)
      let todayExpenses = 0
      if (profile?.role === 'admin') {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('expense_date', today)

        todayExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
      }

      setStats({
        activePatients: activePatients || 0,
        todayAdmissions: todayAdmissions || 0,
        todayCollection,
        pendingAmount,
        totalDoctors: totalDoctors || 0,
        todayExpenses,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Active Patients"
          value={stats.activePatients}
          color="blue"
        />
        <StatCard
          title="Today's Admissions"
          value={stats.todayAdmissions}
          color="green"
        />
        <StatCard
          title="Today's Collection"
          value={`₹ ${stats.todayCollection.toLocaleString()}`}
          color="green"
        />
        <StatCard
          title="Pending Amount"
          value={`₹ ${stats.pendingAmount.toLocaleString()}`}
          color="yellow"
        />
        <StatCard
          title="Total Doctors"
          value={stats.totalDoctors}
          color="purple"
        />
        {profile?.role === 'admin' && (
          <StatCard
            title="Today's Expenses"
            value={`₹ ${stats.todayExpenses.toLocaleString()}`}
            color="red"
          />
        )}
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="flex flex-wrap gap-4">
          {(profile?.role === 'admin' || profile?.role === 'worker') && (
            <>
              <Link href="/patients/new">
                <Button size="lg">+ New Patient</Button>
              </Link>
              <Link href="/admissions/new">
                <Button size="lg" variant="success">+ New Admission</Button>
              </Link>
            </>
          )}
          {(profile?.role === 'admin' || profile?.role === 'worker' || profile?.role === 'billing') && (
            <Link href="/billing">
              <Button size="lg" variant="secondary">View Bills</Button>
            </Link>
          )}
          {profile?.role === 'admin' && (
            <>
              <Link href="/users/new">
                <Button size="lg" variant="outline">+ Add User</Button>
              </Link>
              <Link href="/expenses/new">
                <Button size="lg" variant="danger">+ Add Expense</Button>
              </Link>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
