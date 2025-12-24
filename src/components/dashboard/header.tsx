'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  HelpCircle,
  Users,
  UserPlus,
  Receipt,
  FlaskConical,
  Database,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  worker: 'Staff',
  billing: 'Billing Staff',
  doctor: 'Doctor',
  pathology: 'Pathology',
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  read: boolean
  createdAt: string
}

export function Header() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'System Ready',
      message: 'Hospital management system is running in offline mode.',
      type: 'info',
      read: false,
      createdAt: new Date().toISOString()
    }
  ])

  // Global keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  function handleSearch(value: string) {
    setOpen(false)
    // Navigate based on selection
    if (value.startsWith('/')) {
      router.push(value)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        {/* Left: Welcome Text */}
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Welcome back, {user?.full_name || 'User'}
            </h2>
            <p className="text-xs text-gray-500">
              {user?.role ? roleLabels[user.role] : ''}
            </p>
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="flex-1 max-w-xl mx-8">
          <Button
            variant="outline"
            className="w-full justify-start text-gray-500 font-normal"
            onClick={() => setOpen(true)}
          >
            <Search className="h-4 w-4 mr-2" />
            <span>Search patients, admissions, bills...</span>
            <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border border-gray-200 bg-gray-100 px-1.5 font-mono text-[10px] font-medium text-gray-600">
              <span className="text-xs">Ctrl</span>K
            </kbd>
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-blue-600"
                    onClick={() => setNotifications(n => n.map(item => ({ ...item, read: true })))}
                  >
                    Mark all read
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-4 text-center text-sm text-gray-500">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 cursor-pointer",
                      !notification.read && "bg-blue-50"
                    )}
                    onClick={() => setNotifications(n =>
                      n.map(item => item.id === notification.id ? { ...item, read: true } : item)
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium text-sm">{notification.title}</span>
                      <Badge
                        variant={
                          notification.type === 'error' ? 'destructive' :
                          notification.type === 'warning' ? 'warning' :
                          notification.type === 'success' ? 'success' : 'secondary'
                        }
                        className="ml-auto text-[10px]"
                      >
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{notification.message}</p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.full_name}</span>
                  <span className="text-xs font-normal text-gray-500">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings/backup')}>
                <Database className="h-4 w-4 mr-2" />
                Backup & Restore
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="h-4 w-4 mr-2" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Search Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search patients, admissions, bills..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => handleSearch('/patients/new')}>
              <Users className="h-4 w-4 mr-2" />
              New Patient Registration
            </CommandItem>
            <CommandItem onSelect={() => handleSearch('/admissions/new')}>
              <UserPlus className="h-4 w-4 mr-2" />
              New Admission
            </CommandItem>
            <CommandItem onSelect={() => handleSearch('/billing/new')}>
              <Receipt className="h-4 w-4 mr-2" />
              Create Bill
            </CommandItem>
            <CommandItem onSelect={() => handleSearch('/pathology/new')}>
              <FlaskConical className="h-4 w-4 mr-2" />
              Order Lab Test
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => handleSearch('/dashboard')}>
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => handleSearch('/patients')}>
              Patients List
            </CommandItem>
            <CommandItem onSelect={() => handleSearch('/admissions')}>
              Admissions
            </CommandItem>
            <CommandItem onSelect={() => handleSearch('/billing')}>
              Billing
            </CommandItem>
            <CommandItem onSelect={() => handleSearch('/reports')}>
              Reports
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
