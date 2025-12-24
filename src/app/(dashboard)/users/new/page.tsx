'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Eye, EyeOff, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

// Enhanced user schema with password validation
const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['admin', 'worker', 'doctor', 'billing', 'pathology']),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits').optional().or(z.literal('')),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type UserRegistrationInput = z.infer<typeof userRegistrationSchema>

export default function NewUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserRegistrationInput>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      email: '',
      full_name: '',
      role: 'worker',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password')
  const role = watch('role')

  // Password strength indicators
  const passwordStrength = {
    hasLength: password?.length >= 8,
    hasUpperCase: /[A-Z]/.test(password || ''),
    hasLowerCase: /[a-z]/.test(password || ''),
    hasNumber: /[0-9]/.test(password || ''),
    hasSpecial: /[^A-Za-z0-9]/.test(password || ''),
  }

  const allChecksPassed = Object.values(passwordStrength).every(Boolean)

  const onSubmit = async (data: UserRegistrationInput) => {
    setSubmitError('')
    setLoading(true)

    try {
      // Call API route to create user with hashed password
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          phone: data.phone || null,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user')
      }

      router.push('/users')
      router.refresh()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user'
      setSubmitError(errorMessage)
      setLoading(false)
    }
  }

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-gray-500'}`}>
      {met ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-gray-400" />
      )}
      <span>{text}</span>
    </div>
  )

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Add New User</h1>
        <p className="text-gray-600 mt-1">Create a new user account with role-based access</p>
      </div>

      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="space-y-4">
              <Input
                label="Full Name *"
                placeholder="Enter full name"
                error={errors.full_name?.message}
                {...register('full_name')}
              />

              <Input
                label="Email Address *"
                type="email"
                placeholder="user@example.com"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="10-digit mobile number"
                maxLength={10}
                error={errors.phone?.message}
                {...register('phone')}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Role & Permissions</h2>
            <div>
              <label className="block text-sm font-medium mb-2">User Role *</label>
              <Select
                value={role}
                onValueChange={(value) => setValue('role', value as any)}
              >
                <SelectTrigger error={errors.role?.message}>
                  <SelectValue placeholder="Select user role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex flex-col">
                      <span className="font-medium">Administrator</span>
                      <span className="text-xs text-gray-500">Full system access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="worker">
                    <div className="flex flex-col">
                      <span className="font-medium">Staff/Worker</span>
                      <span className="text-xs text-gray-500">Patient management, admissions</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="billing">
                    <div className="flex flex-col">
                      <span className="font-medium">Billing Staff</span>
                      <span className="text-xs text-gray-500">Billing and payments</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="doctor">
                    <div className="flex flex-col">
                      <span className="font-medium">Doctor</span>
                      <span className="text-xs text-gray-500">Medical records, prescriptions</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pathology">
                    <div className="flex flex-col">
                      <span className="font-medium">Pathology</span>
                      <span className="text-xs text-gray-500">Lab tests and results</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Password Setup */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Security</h2>
            <div className="space-y-4">
              <div>
                <div className="relative">
                  <Input
                    label="Password *"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    error={errors.password?.message}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {password && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <PasswordRequirement met={passwordStrength.hasLength} text="At least 8 characters" />
                      <PasswordRequirement met={passwordStrength.hasUpperCase} text="One uppercase letter" />
                      <PasswordRequirement met={passwordStrength.hasLowerCase} text="One lowercase letter" />
                      <PasswordRequirement met={passwordStrength.hasNumber} text="One number" />
                      <PasswordRequirement met={passwordStrength.hasSpecial} text="One special character" />
                    </div>
                    {allChecksPassed && (
                      <div className="mt-2 flex items-center gap-2 text-green-600 text-xs font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Password meets all requirements</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <Input
                  label="Confirm Password *"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Passwords are securely hashed using bcrypt before storage. Users will receive login credentials via email.
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              <p className="font-medium">Error creating user</p>
              <p className="text-sm">{submitError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <Button type="submit" size="lg" loading={loading} disabled={loading}>
              Create User
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
