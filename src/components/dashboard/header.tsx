'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'

export function Header() {
  const { profile, signOut } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    worker: 'Staff',
    billing: 'Billing Staff',
    doctor: 'Doctor',
  }

  return (
    <header className="bg-white shadow-sm border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Welcome, {profile?.full_name || 'User'}
          </h2>
          <p className="text-sm text-gray-500">
            {profile?.role ? roleLabels[profile.role] : ''}
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  )
}
