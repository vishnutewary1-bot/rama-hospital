// Database Types for Rama Hospital Management System

export type UserRole = 'admin' | 'worker' | 'doctor' | 'billing'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Doctor {
  id: string
  user_id?: string
  name: string
  specialization: string
  qualification?: string
  phone?: string
  email?: string
  consultation_fee: number
  follow_up_fee: number
  is_visiting: boolean
  visit_days?: string[]
  visit_timings?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Area {
  id: string
  name: string
  pincode?: string
  is_active: boolean
  created_at: string
}

export interface Referral {
  id: string
  name: string
  type?: 'Doctor' | 'Staff' | 'Patient' | 'Advertisement' | 'Other'
  is_active: boolean
  created_at: string
}

export interface Patient {
  id: string
  registration_number: string
  name: string
  age: number
  gender: 'Male' | 'Female' | 'Other'
  mobile: string
  alternate_mobile?: string
  address?: string
  area_id?: string
  referral_id?: string
  blood_group?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Joined fields
  area?: Area
  referral?: Referral
}

export type AdmissionStatus = 'Active' | 'Discharged' | 'LAMA' | 'Transferred' | 'Deceased'
export type WardType = 'General' | 'ICU' | 'NICU' | 'Private'

export interface Admission {
  id: string
  patient_id: string
  admission_number: string
  admission_date: string
  discharge_date?: string
  ward_type: WardType
  caretaker_name: string
  caretaker_mobile: string
  caretaker_relation?: string
  doctor_id?: string
  diagnosis?: string
  status: AdmissionStatus
  discharge_summary?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Joined fields
  patient?: Patient
  doctor?: Doctor
}

export interface ServiceCategory {
  id: string
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export type UnitType = 'fixed' | 'per_day' | 'per_hour' | 'per_unit'

export interface Service {
  id: string
  category_id: string
  name: string
  unit_type: UnitType
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  category?: ServiceCategory
}

export type BillStatus = 'Draft' | 'Partial' | 'Paid' | 'Cancelled'

export interface Bill {
  id: string
  bill_number: string
  admission_id: string
  patient_id: string
  total_amount: number
  discount_amount: number
  discount_reason?: string
  net_amount: number
  amount_received: number
  status: BillStatus
  finalized_at?: string
  finalized_by?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Joined fields
  admission?: Admission
  patient?: Patient
}

export interface BillItem {
  id: string
  bill_id: string
  service_id?: string
  service_name: string
  unit_price: number
  quantity: number
  total_amount: number
  notes?: string
  added_by?: string
  created_at: string
}

export type PaymentMode = 'Cash' | 'Card' | 'UPI' | 'NEFT' | 'Cheque' | 'Insurance'

export interface Payment {
  id: string
  bill_id: string
  payment_number: string
  amount: number
  payment_mode: PaymentMode
  payment_reference?: string
  payment_date: string
  received_by?: string
  notes?: string
  created_at: string
}

export interface ExpenseCategory {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface Expense {
  id: string
  category_id: string
  description: string
  amount: number
  expense_date: string
  payment_mode?: string
  vendor_name?: string
  invoice_number?: string
  notes?: string
  created_by?: string
  created_at: string
  // Joined fields
  category?: ExpenseCategory
}
