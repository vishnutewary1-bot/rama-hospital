'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', roles: ['admin', 'worker', 'billing', 'doctor'] },
  { href: '/patients', label: 'Patients', roles: ['admin', 'worker'] },
  { href: '/admissions', label: 'Admissions', roles: ['admin', 'worker'] },
  { href: '/billing', label: 'Billing', roles: ['admin', 'worker', 'billing'] },
  { href: '/doctors', label: 'Doctors', roles: ['admin'] },
  { href: '/services', label: 'Services', roles: ['admin'] },
  { href: '/users', label: 'Users', roles: ['admin'] },
  { href: '/expenses', label: 'Expenses', roles: ['admin'] },
  { href: '/reports', label: 'Reports', roles: ['admin', 'billing'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile } = useAuth()

  const filteredMenu = menuItems.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  )

  return (
    <aside className="w-64 bg-white shadow-md min-h-screen">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-blue-600">RAMA HOSPITAL</h1>
        <p className="text-sm text-gray-500">Management System</p>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          {filteredMenu.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-4 py-3 rounded text-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
