// Database Types for Rama Hospital Management System

export type UserRole = 'admin' | 'worker' | 'doctor' | 'billing' | 'pathology'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  is_active: boolean
  last_login?: string
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
  visit_days?: string
  visit_timings?: string
  opd_days?: string
  opd_timings?: string
  bank_name?: string
  bank_account_number?: string
  bank_ifsc?: string
  commission_percentage?: number
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
  phone?: string
  commission_percentage?: number
  is_active: boolean
  created_at: string
}

// Ward & Bed Management
export type WardType = 'General' | 'Semi-Private' | 'Private' | 'ICU' | 'NICU' | 'PICU' | 'CCU' | 'Emergency' | 'Maternity' | 'Pediatric' | 'Surgical' | 'Isolation'

export interface Ward {
  id: string
  name: string
  type: WardType
  floor?: string
  total_beds: number
  daily_rate: number
  nursing_charge: number
  is_active: boolean
  created_at: string
  // Computed
  available_beds?: number
  occupied_beds?: number
}

export type BedStatus = 'available' | 'occupied' | 'maintenance' | 'reserved'

export interface Bed {
  id: string
  ward_id: string
  bed_number: string
  status: BedStatus
  current_admission_id?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined
  ward?: Ward
  admission?: Admission
}

export interface Patient {
  id: string
  registration_number: string
  name: string
  age: number
  age_unit?: 'years' | 'months' | 'days'
  gender: 'Male' | 'Female' | 'Other'
  date_of_birth?: string
  mobile: string
  alternate_mobile?: string
  email?: string
  address?: string
  area_id?: string
  pincode?: string
  referral_id?: string
  blood_group?: string
  photo?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  medical_alerts?: string
  allergies?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Joined fields
  area?: Area
  referral?: Referral
}

export type AdmissionStatus = 'Active' | 'Discharged' | 'LAMA' | 'Transferred' | 'Deceased'

export interface Admission {
  id: string
  patient_id: string
  admission_number: string
  admission_date: string
  discharge_date?: string
  ward_id?: string
  bed_id?: string
  ward_type?: string
  caretaker_name?: string
  caretaker_mobile?: string
  caretaker_relation?: string
  doctor_id?: string
  diagnosis?: string
  chief_complaints?: string
  status: AdmissionStatus
  discharge_summary?: string
  // MLC Fields
  is_mlc?: boolean
  mlc_number?: string
  police_station?: string
  brought_by?: string
  // Insurance
  has_insurance?: boolean
  insurance_company?: string
  insurance_policy_number?: string
  insurance_amount?: number
  // Vitals
  vitals_bp?: string
  vitals_pulse?: number
  vitals_temperature?: number
  vitals_spo2?: number
  vitals_weight?: number
  vitals_height?: number
  created_by?: string
  created_at: string
  updated_at: string
  // Joined fields
  patient?: Patient
  doctor?: Doctor
  ward?: Ward
  bed?: Bed
}

// Pathology
export interface PathologyCategory {
  id: string
  name: string
  description?: string
  display_order: number
  is_active: boolean
  created_at: string
}

export interface PathologyTest {
  id: string
  category_id: string
  name: string
  short_name?: string
  method?: string
  sample_type?: string
  sample_volume?: string
  container_type?: string
  reporting_time?: string
  price: number
  cost?: number
  is_outsourced: boolean
  outsource_lab?: string
  outsource_cost?: number
  is_package: boolean
  package_tests?: string
  interpretation?: string
  is_active: boolean
  created_at: string
  // Joined
  category?: PathologyCategory
  parameters?: PathologyTestParameter[]
}

export interface PathologyTestParameter {
  id: string
  test_id: string
  name: string
  unit?: string
  normal_range_male?: string
  normal_range_female?: string
  normal_range_child?: string
  critical_low?: number
  critical_high?: number
  display_order: number
  is_active: boolean
  created_at: string
}

export type TestPriority = 'routine' | 'urgent' | 'stat'
export type TestStatus = 'ordered' | 'sample_collected' | 'processing' | 'completed' | 'verified' | 'cancelled'

export interface PatientTest {
  id: string
  order_number: string
  patient_id: string
  admission_id?: string
  test_id: string
  doctor_id?: string
  ordered_by: string
  order_date: string
  priority: TestPriority
  sample_collected: boolean
  sample_collected_at?: string
  sample_collected_by?: string
  sample_barcode?: string
  status: TestStatus
  result_entered_at?: string
  result_entered_by?: string
  verified_at?: string
  verified_by?: string
  notes?: string
  bill_id?: string
  created_at: string
  // Joined
  patient?: Patient
  test?: PathologyTest
  doctor?: Doctor
  results?: PatientTestResult[]
}

export interface PatientTestResult {
  id: string
  patient_test_id: string
  parameter_id: string
  value?: string
  is_abnormal: boolean
  is_critical: boolean
  remarks?: string
  created_at: string
  updated_at: string
  // Joined
  parameter?: PathologyTestParameter
}

// Medical Records
export type RecordType = 'consultation' | 'prescription' | 'progress_note' | 'surgery_note' | 'discharge_summary' | 'investigation' | 'procedure' | 'other'

export interface MedicalRecord {
  id: string
  patient_id: string
  admission_id?: string
  record_type: RecordType
  record_date: string
  doctor_id?: string
  title?: string
  content?: string
  diagnosis?: string
  treatment_plan?: string
  prescriptions?: string
  follow_up_date?: string
  vitals_bp?: string
  vitals_pulse?: number
  vitals_temperature?: number
  vitals_spo2?: number
  vitals_weight?: number
  attachments?: string
  created_by: string
  created_at: string
  updated_at: string
  // Joined
  patient?: Patient
  doctor?: Doctor
  admission?: Admission
}

// Billing
export interface ServiceCategory {
  id: string
  name: string
  description?: string
  display_order: number
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
  cost?: number
  hsn_code?: string
  tax_percentage?: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  category?: ServiceCategory
}

export type BillType = 'OPD' | 'IPD' | 'Pathology' | 'Emergency' | 'Pharmacy'
export type BillStatus = 'Draft' | 'Partial' | 'Paid' | 'Cancelled'

export interface Bill {
  id: string
  bill_number: string
  bill_type: BillType
  admission_id?: string
  patient_id: string
  doctor_id?: string
  bill_date: string
  total_amount: number
  discount_percentage?: number
  discount_amount: number
  discount_reason?: string
  discount_approved_by?: string
  tax_amount?: number
  net_amount: number
  amount_received: number
  amount_due: number
  status: BillStatus
  notes?: string
  internal_notes?: string
  finalized_at?: string
  finalized_by?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Joined fields
  admission?: Admission
  patient?: Patient
  doctor?: Doctor
  items?: BillItem[]
  payments?: Payment[]
}

export interface BillItem {
  id: string
  bill_id: string
  service_id?: string
  service_name: string
  unit_price: number
  quantity: number
  discount_percentage?: number
  discount_amount?: number
  tax_percentage?: number
  tax_amount?: number
  total_amount: number
  notes?: string
  created_at: string
}

export type PaymentMode = 'Cash' | 'Card' | 'UPI' | 'NEFT' | 'RTGS' | 'Cheque' | 'Insurance' | 'Online' | 'Wallet'

export interface Payment {
  id: string
  bill_id: string
  payment_number: string
  amount: number
  payment_mode: PaymentMode
  payment_date: string
  transaction_reference?: string
  cheque_number?: string
  cheque_date?: string
  cheque_bank?: string
  card_last_digits?: string
  received_by?: string
  receipt_printed?: boolean
  notes?: string
  created_at: string
}

// Expenses
export interface ExpenseCategory {
  id: string
  name: string
  description?: string
  budget_limit?: number
  is_active: boolean
  created_at: string
}

export type ExpenseStatus = 'pending' | 'approved' | 'rejected'

export interface Expense {
  id: string
  expense_number?: string
  category_id: string
  description: string
  amount: number
  expense_date: string
  payment_mode?: string
  vendor_name?: string
  vendor_contact?: string
  invoice_number?: string
  invoice_date?: string
  is_recurring?: boolean
  recurring_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  requires_approval?: boolean
  approved_by?: string
  approved_at?: string
  status?: ExpenseStatus
  notes?: string
  attachments?: string
  created_by?: string
  created_at: string
  updated_at?: string
  // Joined fields
  category?: ExpenseCategory
}

// Audit & Settings
export interface AuditLog {
  id: string
  user_id: string
  action: string
  table_name?: string
  record_id?: string
  old_values?: string
  new_values?: string
  ip_address?: string
  user_agent?: string
  created_at: string
  // Joined
  user?: User
}

export interface Setting {
  id: string
  category: string
  key: string
  value?: string
  description?: string
  updated_by?: string
  updated_at: string
}

export type PrintTemplateType = 'bill' | 'receipt' | 'discharge_summary' | 'lab_report' | 'patient_card' | 'prescription' | 'opd_slip'

export interface PrintTemplate {
  id: string
  name: string
  type: PrintTemplateType
  template: string
  is_default: boolean
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

// Appointment & OPD Module
export type AppointmentType = 'Consultation' | 'Follow-up' | 'Procedure' | 'Check-up'
export type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Cancelled' | 'Completed' | 'No-show'

export interface Appointment {
  id: string
  appointment_number: string
  patient_id: string
  doctor_id: string
  appointment_date: string
  appointment_time: string
  appointment_type: AppointmentType
  duration_minutes: number
  reason: string
  notes?: string
  status: AppointmentStatus
  cancellation_reason?: string
  cancelled_at?: string
  confirmed_at?: string
  reminder_sent: boolean
  reminder_sent_at?: string
  opd_registration_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Joined fields
  patient?: Patient
  doctor?: Doctor
  opd_registration?: OPDRegistration
}

export interface DoctorAvailability {
  id: string
  doctor_id: string
  day_of_week: number
  day_name?: string
  start_time: string
  end_time: string
  slot_duration_minutes: number
  max_patients_per_slot: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  doctor?: Doctor
}

export type LeaveType = 'Sick' | 'Vacation' | 'Emergency' | 'Conference' | 'Other'

export interface DoctorLeave {
  id: string
  doctor_id: string
  start_date: string
  end_date: string
  reason: string
  leave_type: LeaveType
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  // Joined fields
  doctor?: Doctor
}

export type OPDVisitType = 'New' | 'Follow-up' | 'Emergency'
export type OPDStatus = 'Waiting' | 'In-Consultation' | 'Completed' | 'Cancelled'
export type PaymentStatus = 'Paid' | 'Pending'

export interface OPDRegistration {
  id: string
  registration_number: string
  patient_id: string
  doctor_id: string
  appointment_id?: string
  visit_date: string
  visit_type: OPDVisitType
  visit_reason: string
  referred_by?: string
  token_number?: string
  consultation_fee: number
  payment_mode?: PaymentMode
  payment_status: PaymentStatus
  status: OPDStatus
  checked_in_at?: string
  consultation_started_at?: string
  consultation_ended_at?: string
  registered_by?: string
  created_at: string
  updated_at: string
  // Joined fields
  patient?: Patient
  doctor?: Doctor
  appointment?: Appointment
}

export interface OPDConsultation {
  id: string
  opd_id: string
  patient_id: string
  doctor_id: string
  consultation_date: string
  chief_complaint: string
  history_of_present_illness?: string
  past_medical_history?: string
  examination_findings?: string
  diagnosis: string
  treatment_plan?: string
  prescriptions?: string
  investigations_ordered?: string
  advice?: string
  follow_up_date?: string
  follow_up_instructions?: string
  bp_systolic?: number
  bp_diastolic?: number
  pulse?: number
  temperature?: number
  spo2?: number
  respiratory_rate?: number
  weight?: number
  height?: number
  bmi?: number
  is_emergency: boolean
  requires_admission: boolean
  notes?: string
  created_at: string
  updated_at: string
  // Joined fields
  patient?: Patient
  doctor?: Doctor
  opd_registration?: OPDRegistration
}

// Dashboard Stats
export interface DashboardStats {
  totalPatients: number
  activeAdmissions: number
  todayAdmissions: number
  todayCollection: number
  pendingAmount: number
  totalDoctors: number
  todayExpenses: number
  availableBeds: number
  occupiedBeds: number
  pendingTests: number
}

// Report Types
export interface CollectionByMode {
  payment_mode: PaymentMode
  total: number
  count: number
}

export interface RevenueByService {
  service_name: string
  count: number
  total: number
}

export interface RevenueReport {
  total_revenue: number
  total_collection: number
  pending_amount: number
  total_expenses: number
  net_profit: number
  collection_by_mode: CollectionByMode[]
  revenue_by_service: RevenueByService[]
}
