'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Database,
  Wifi,
  Clock
} from 'lucide-react'

interface SystemStatus {
  dbConnected: boolean
  version: string
}

export function StatusBar() {
  const [status, setStatus] = useState<SystemStatus>({
    dbConnected: true,
    version: '1.0.0'
  })
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <footer className="bg-gray-800 text-gray-300 px-4 py-1.5 flex items-center justify-between text-xs fixed bottom-0 left-0 right-0 z-50">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Database Status */}
        <div className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-green-400" />
          <span className="text-green-400">Connected</span>
        </div>

        <span className="text-gray-600">|</span>

        {/* Online Mode Indicator */}
        <div className="flex items-center gap-1.5">
          <Wifi className="h-3.5 w-3.5 text-green-400" />
          <span className="text-green-400">Online</span>
        </div>
      </div>

      {/* Center Section */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Rama Hospital Management System</span>
        <span className="text-gray-600">v{status.version}</span>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDate(currentTime)}</span>
          <span className="text-blue-400 font-medium">{formatTime(currentTime)}</span>
        </div>
      </div>
    </footer>
  )
}
