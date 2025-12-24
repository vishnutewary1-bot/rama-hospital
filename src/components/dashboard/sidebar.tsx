'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  Receipt,
  Stethoscope,
  ClipboardList,
  Settings,
  DollarSign,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  BedDouble,
  FileText,
  Activity,
  Shield,
  Pill,
  Calendar,
  Clipboard
} from 'lucide-react'

interface MenuItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: string[]
  badge?: number
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, roles: ['admin', 'worker', 'billing', 'doctor', 'pathology'] },
  { href: '/patients', label: 'Patients', icon: <Users className="h-5 w-5" />, roles: ['admin', 'worker'] },
  { href: '/appointments', label: 'Appointments', icon: <Calendar className="h-5 w-5" />, roles: ['admin', 'worker'] },
  { href: '/opd', label: 'OPD', icon: <Clipboard className="h-5 w-5" />, roles: ['admin', 'worker', 'doctor'] },
  { href: '/admissions', label: 'Admissions', icon: <UserPlus className="h-5 w-5" />, roles: ['admin', 'worker'] },
  { href: '/wards', label: 'Wards & Beds', icon: <BedDouble className="h-5 w-5" />, roles: ['admin', 'worker'] },
  { href: '/billing', label: 'Billing', icon: <Receipt className="h-5 w-5" />, roles: ['admin', 'worker', 'billing'] },
  { href: '/pharmacy', label: 'Pharmacy', icon: <Pill className="h-5 w-5" />, roles: ['admin', 'worker'] },
  { href: '/pathology', label: 'Pathology', icon: <FlaskConical className="h-5 w-5" />, roles: ['admin', 'pathology'] },
  { href: '/medical-records', label: 'Medical Records', icon: <FileText className="h-5 w-5" />, roles: ['admin', 'doctor'] },
  { href: '/doctors', label: 'Doctors', icon: <Stethoscope className="h-5 w-5" />, roles: ['admin'] },
  { href: '/doctor-availability', label: 'Doctor Schedule', icon: <Calendar className="h-5 w-5" />, roles: ['admin'] },
  { href: '/services', label: 'Services', icon: <ClipboardList className="h-5 w-5" />, roles: ['admin'] },
  { href: '/users', label: 'Users', icon: <Shield className="h-5 w-5" />, roles: ['admin'] },
  { href: '/expenses', label: 'Expenses', icon: <DollarSign className="h-5 w-5" />, roles: ['admin'] },
  { href: '/reports', label: 'Reports', icon: <BarChart3 className="h-5 w-5" />, roles: ['admin', 'billing'] },
  { href: '/audit-logs', label: 'Audit Logs', icon: <Activity className="h-5 w-5" />, roles: ['admin'] },
  { href: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" />, roles: ['admin'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const filteredMenu = menuItems.filter(item =>
    user?.role && item.roles.includes(user.role)
  )

  return (
    <aside
      className={cn(
        "bg-white border-r border-gray-200 min-h-screen transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        "p-4 border-b border-gray-200 flex items-center",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold text-blue-600">RAMA HOSPITAL</h1>
            <p className="text-xs text-gray-500">Management System</p>
          </div>
        )}
        {collapsed && (
          <Building2 className="h-8 w-8 text-blue-600" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {filteredMenu.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("w-full", collapsed ? "px-2" : "")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
