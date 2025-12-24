// Zod Validation Schemas for Hospital Management System
import { z } from 'zod'

// Patient Validation
export const patientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  age: z.number().min(0).max(150),
  age_unit: z.enum(['years', 'months', 'days']).optional(),
  gender: z.enum(['Male', 'Female', 'Other']),
  date_of_birth: z.string().optional(),
  mobile: z.string().regex(/^[0-9]{10}$/, 'Mobile must be 10 digits'),
  alternate_mobile: z.string().regex(/^[0-9]{10}$/).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  area_id: z.string().uuid().optional(),
  pincode: z.string().max(10).optional(),
  blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).optional(),
  allergies: z.string().optional(),
  medical_alerts: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().regex(/^[0-9]{10}$/).optional().or(z.literal('')),
  emergency_contact_relation: z.string().optional(),
  referral_id: z.string().uuid().optional(),
  photo: z.string().url().optional(),
})

// Doctor Validation
export const doctorSchema = z.object({
  name: z.string().min(2).max(100),
  specialization: z.string().min(2).max(100),
  qualification: z.string().optional(),
  phone: z.string().regex(/^[0-9]{10}$/).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  consultation_fee: z.number().min(0),
  follow_up_fee: z.number().min(0),
  is_visiting: z.boolean(),
  visit_days: z.string().optional(),
  visit_timings: z.string().optional(),
  opd_days: z.string().optional(),
  opd_timings: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional().or(z.literal('')),
  commission_percentage: z.number().min(0).max(100).optional(),
})

// User Validation
export const userSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).max(100),
  role: z.enum(['admin', 'worker', 'doctor', 'billing', 'pathology']),
  phone: z.string().regex(/^[0-9]{10}$/).optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
})

// Admission Validation (base schema without refinement)
export const admissionBaseSchema = z.object({
  patient_id: z.string().uuid('Please select a patient'),
  ward_id: z.string().uuid('Please select a ward'),
  bed_id: z.string().uuid().optional(),
  doctor_id: z.string().uuid('Please select a doctor'),
  admission_date: z.string(),
  diagnosis: z.string().optional(),
  symptoms: z.string().optional(),
  treatment_plan: z.string().optional(),
  is_mlc: z.boolean().default(false),
  mlc_number: z.string().optional(),
  police_station: z.string().optional(),
  is_emergency: z.boolean().default(false),
  referred_by: z.string().optional(),
  insurance_company: z.string().optional(),
  insurance_policy_number: z.string().optional(),
  insurance_tpa: z.string().optional(),
  advance_amount: z.number().min(0).optional(),
  // Vitals
  bp_systolic: z.number().min(0).max(300).optional(),
  bp_diastolic: z.number().min(0).max(200).optional(),
  pulse: z.number().min(0).max(300).optional(),
  temperature: z.number().min(90).max(110).optional(),
  spo2: z.number().min(0).max(100).optional(),
  respiratory_rate: z.number().min(0).max(100).optional(),
  weight: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
})

// Admission Validation with MLC validation
export const admissionSchema = admissionBaseSchema.refine(
  (data) => !data.is_mlc || (data.mlc_number && data.police_station),
  {
    message: 'MLC number and police station are required for MLC cases',
    path: ['mlc_number'],
  }
)

// Bill Validation
export const billSchema = z.object({
  patient_id: z.string().uuid('Please select a patient'),
  admission_id: z.string().uuid().optional(),
  type: z.enum(['OPD', 'IPD', 'Pathology', 'Emergency', 'Pharmacy', 'Other']),
  bill_date: z.string(),
  items: z.array(z.object({
    service_id: z.string().uuid().optional(),
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(1),
    rate: z.number().min(0),
    amount: z.number().min(0),
  })).min(1, 'At least one item is required'),
  discount: z.number().min(0).optional(),
  discount_percentage: z.number().min(0).max(100).optional(),
  tax: z.number().min(0).optional(),
  tax_percentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
})

// Payment Validation
export const paymentSchema = z.object({
  bill_id: z.string().uuid(),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  mode: z.enum(['Cash', 'Card', 'UPI', 'NEFT', 'RTGS', 'Cheque', 'Insurance', 'Online', 'Other']),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
  received_by: z.string().uuid(),
})

// Pathology Test Order Validation
export const pathologyOrderSchema = z.object({
  patient_id: z.string().uuid('Please select a patient'),
  test_id: z.string().uuid('Please select a test'),
  doctor_id: z.string().uuid().optional(),
  priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
  sample_type: z.string().optional(),
  clinical_notes: z.string().optional(),
  order_date: z.string(),
})

// Pathology Test Result Validation
export const pathologyResultSchema = z.object({
  test_id: z.string().uuid(),
  results: z.array(z.object({
    parameter_id: z.string().uuid(),
    value: z.string(),
    is_abnormal: z.boolean().default(false),
  })),
  technician_notes: z.string().optional(),
  verified_by: z.string().uuid().optional(),
})

// Medical Record Validation
export const medicalRecordSchema = z.object({
  patient_id: z.string().uuid('Please select a patient'),
  doctor_id: z.string().uuid('Please select a doctor'),
  admission_id: z.string().uuid().optional(),
  record_type: z.enum([
    'consultation',
    'prescription',
    'progress_note',
    'surgery_note',
    'discharge_summary',
    'investigation',
    'referral_letter',
    'other'
  ]),
  record_date: z.string(),
  title: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  diagnosis: z.string().optional(),
  treatment_plan: z.string().optional(),
  prescriptions: z.string().optional(),
  follow_up_date: z.string().optional(),
  // Vitals
  bp_systolic: z.number().min(0).max(300).optional(),
  bp_diastolic: z.number().min(0).max(200).optional(),
  pulse: z.number().min(0).max(300).optional(),
  temperature: z.number().min(90).max(110).optional(),
  spo2: z.number().min(0).max(100).optional(),
})

// Expense Validation
export const expenseSchema = z.object({
  category_id: z.string().uuid('Please select a category'),
  date: z.string(),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  payment_mode: z.enum(['Cash', 'Card', 'UPI', 'NEFT', 'RTGS', 'Cheque', 'Other']),
  reference_number: z.string().optional(),
  vendor_name: z.string().optional(),
  notes: z.string().optional(),
  receipt_image: z.string().url().optional(),
})

// Service Validation
export const serviceSchema = z.object({
  category_id: z.string().uuid('Please select a category'),
  name: z.string().min(2).max(200),
  code: z.string().optional(),
  rate: z.number().min(0),
  description: z.string().optional(),
  duration_minutes: z.number().min(0).optional(),
  requires_doctor: z.boolean().default(false),
})

// Ward Validation
export const wardSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum([
    'General',
    'Semi-Private',
    'Private',
    'ICU',
    'NICU',
    'PICU',
    'CCU',
    'Emergency',
    'Maternity',
    'Pediatric',
    'Surgical',
    'Isolation'
  ]),
  floor: z.string().optional(),
  total_beds: z.number().min(1),
  daily_rate: z.number().min(0),
  nursing_charge: z.number().min(0),
})

// Bed Validation
export const bedSchema = z.object({
  ward_id: z.string().uuid('Please select a ward'),
  bed_number: z.string().min(1),
  status: z.enum(['available', 'occupied', 'maintenance', 'reserved']).default('available'),
  notes: z.string().optional(),
})

// Login Validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Settings Validation
export const settingsSchema = z.object({
  hospital_name: z.string().min(2).max(200),
  hospital_address: z.string().optional(),
  hospital_phone: z.string().optional(),
  hospital_email: z.string().email().optional().or(z.literal('')),
  hospital_website: z.string().url().optional().or(z.literal('')),
  hospital_logo: z.string().url().optional(),
  tax_enabled: z.boolean().default(false),
  tax_percentage: z.number().min(0).max(100).optional(),
  currency: z.string().default('INR'),
  date_format: z.string().default('DD/MM/YYYY'),
  auto_backup_enabled: z.boolean().default(false),
  auto_backup_time: z.string().optional(),
})

// =====================================================
// PHARMACY MODULE VALIDATIONS
// =====================================================

// Pharmacy Supplier Validation
export const pharmacySupplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  contact_person: z.string().optional(),
  phone: z.string().regex(/^[0-9]{10}$/).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gst_number: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().or(z.literal('')),
  payment_terms: z.string().optional(),
  is_active: z.boolean().default(true),
})

// Pharmacy Category Validation
export const pharmacyCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})

// Pharmacy Medicine Validation
export const pharmacyMedicineSchema = z.object({
  name: z.string().min(2, 'Medicine name is required').max(200),
  generic_name: z.string().optional(),
  category_id: z.string().uuid().optional(),
  manufacturer: z.string().optional(),
  unit_type: z.enum(['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Sachet', 'Vial', 'Other']),
  strength: z.string().optional(), // e.g., "500mg", "10ml"
  hsn_code: z.string().optional(),
  reorder_level: z.number().min(0).default(10),
  minimum_stock_level: z.number().min(0).default(5),
  maximum_stock_level: z.number().min(0).default(1000),
  storage_conditions: z.string().optional(),
  side_effects: z.string().optional(),
  is_prescription_required: z.boolean().default(true),
  is_narcotic: z.boolean().default(false),
  is_active: z.boolean().default(true),
})

// Pharmacy Stock Validation (base schema without refinements)
export const pharmacyStockBaseSchema = z.object({
  medicine_id: z.string().uuid('Please select a medicine'),
  batch_number: z.string().min(1, 'Batch number is required'),
  supplier_id: z.string().uuid().optional(),
  purchase_date: z.string(),
  expiry_date: z.string(),
  quantity_purchased: z.number().min(1, 'Quantity must be at least 1'),
  quantity_available: z.number().min(0),
  purchase_price: z.number().min(0, 'Purchase price cannot be negative'),
  selling_price: z.number().min(0, 'Selling price cannot be negative'),
  mrp: z.number().min(0, 'MRP cannot be negative'),
  gst_percentage: z.number().min(0).max(100).default(0),
  discount_percentage: z.number().min(0).max(100).default(0),
  rack_number: z.string().optional(),
})

// Pharmacy Stock Validation with date and price checks
export const pharmacyStockSchema = pharmacyStockBaseSchema.refine(
  (data) => new Date(data.expiry_date) > new Date(data.purchase_date),
  {
    message: 'Expiry date must be after purchase date',
    path: ['expiry_date'],
  }
).refine(
  (data) => data.selling_price >= data.purchase_price,
  {
    message: 'Selling price should not be less than purchase price',
    path: ['selling_price'],
  }
)

// Pharmacy Sale Validation
export const pharmacySaleSchema = z.object({
  patient_id: z.string().uuid().optional(),
  admission_id: z.string().uuid().optional(),
  bill_id: z.string().uuid().optional(),
  prescription_id: z.string().uuid().optional(),
  sale_type: z.enum(['OPD', 'IPD', 'Walk-in', 'Emergency']),
  doctor_id: z.string().uuid().optional(),
  items: z.array(z.object({
    stock_id: z.string().uuid('Please select stock'),
    medicine_id: z.string().uuid('Please select medicine'),
    batch_number: z.string().min(1),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unit_price: z.number().min(0),
    discount_percentage: z.number().min(0).max(100).default(0),
    tax_percentage: z.number().min(0).max(100).default(0),
    total_amount: z.number().min(0),
    expiry_date: z.string(),
  })).min(1, 'At least one medicine is required'),
  discount_amount: z.number().min(0).default(0),
  payment_mode: z.enum(['Cash', 'Card', 'UPI', 'Cheque', 'Online', 'Insurance']).optional(),
  payment_status: z.enum(['Paid', 'Pending', 'Partial']).default('Paid'),
  remarks: z.string().optional(),
})

// Pharmacy Stock Adjustment Validation
export const pharmacyStockAdjustmentSchema = z.object({
  stock_id: z.string().uuid('Please select stock'),
  adjustment_type: z.enum(['Expired', 'Damaged', 'Lost', 'Returned', 'Correction', 'Other']),
  quantity: z.number().int().refine((val) => val !== 0, {
    message: 'Quantity cannot be zero',
  }),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
})

// =====================================================
// OPD/CONSULTATION MODULE VALIDATIONS
// =====================================================

// OPD Registration Validation (base schema)
export const opdRegistrationBaseSchema = z.object({
  patient_id: z.string().uuid('Please select a patient'),
  doctor_id: z.string().uuid('Please select a doctor'),
  appointment_id: z.string().uuid().optional(),
  visit_date: z.string(),
  visit_type: z.enum(['New', 'Follow-up', 'Emergency']).default('New'),
  visit_reason: z.string().min(2, 'Visit reason is required'),
  referred_by: z.string().optional(),
  token_number: z.string().optional(),
  consultation_fee: z.number().min(0),
  payment_mode: z.enum(['Cash', 'Card', 'UPI', 'NEFT', 'RTGS', 'Cheque', 'Insurance', 'Online']).optional(),
  payment_status: z.enum(['Paid', 'Pending']).default('Pending'),
})

// OPD Registration Validation (with full validation)
export const opdRegistrationSchema = opdRegistrationBaseSchema

// OPD Consultation Validation (base schema)
export const opdConsultationBaseSchema = z.object({
  opd_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  chief_complaint: z.string().min(2, 'Chief complaint is required'),
  history_of_present_illness: z.string().optional(),
  past_medical_history: z.string().optional(),
  examination_findings: z.string().optional(),
  diagnosis: z.string().min(2, 'Diagnosis is required'),
  treatment_plan: z.string().optional(),
  prescriptions: z.string().optional(),
  investigations_ordered: z.string().optional(),
  advice: z.string().optional(),
  follow_up_date: z.string().optional(),
  follow_up_instructions: z.string().optional(),
  // Vitals
  bp_systolic: z.number().min(0).max(300).optional(),
  bp_diastolic: z.number().min(0).max(200).optional(),
  pulse: z.number().min(0).max(300).optional(),
  temperature: z.number().min(90).max(110).optional(),
  spo2: z.number().min(0).max(100).optional(),
  respiratory_rate: z.number().min(0).max(100).optional(),
  weight: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
})

// OPD Consultation Validation (with full validation)
export const opdConsultationSchema = opdConsultationBaseSchema

// =====================================================
// APPOINTMENT MODULE VALIDATIONS
// =====================================================

// Appointment Validation (base schema without refinement)
export const appointmentBaseSchema = z.object({
  patient_id: z.string().uuid('Please select a patient'),
  doctor_id: z.string().uuid('Please select a doctor'),
  appointment_date: z.string(),
  appointment_time: z.string(),
  appointment_type: z.enum(['Consultation', 'Follow-up', 'Procedure', 'Check-up']).default('Consultation'),
  duration_minutes: z.number().min(5).max(180).default(15),
  reason: z.string().min(2, 'Reason is required'),
  notes: z.string().optional(),
  status: z.enum(['Scheduled', 'Confirmed', 'Cancelled', 'Completed', 'No-show']).default('Scheduled'),
  reminder_sent: z.boolean().default(false),
})

// Appointment Validation with future date check
export const appointmentSchema = appointmentBaseSchema.refine(
  (data) => {
    const appointmentDateTime = new Date(`${data.appointment_date}T${data.appointment_time}`)
    return appointmentDateTime > new Date()
  },
  {
    message: 'Appointment date and time must be in the future',
    path: ['appointment_time'],
  }
)

// Doctor Availability Validation (base schema)
export const doctorAvailabilityBaseSchema = z.object({
  doctor_id: z.string().uuid('Please select a doctor'),
  day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  slot_duration_minutes: z.number().min(5).max(180).default(15),
  max_patients_per_slot: z.number().min(1).max(20).default(1),
  is_active: z.boolean().default(true),
})

// Doctor Availability with time validation
export const doctorAvailabilitySchema = doctorAvailabilityBaseSchema.refine(
  (data) => {
    const start = data.start_time.split(':').map(Number)
    const end = data.end_time.split(':').map(Number)
    const startMinutes = start[0] * 60 + start[1]
    const endMinutes = end[0] * 60 + end[1]
    return endMinutes > startMinutes
  },
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
)

// Doctor Leave Validation (base schema without refinement)
export const doctorLeaveBaseSchema = z.object({
  doctor_id: z.string().uuid('Please select a doctor'),
  start_date: z.string(),
  end_date: z.string(),
  reason: z.string().min(2, 'Reason is required'),
  leave_type: z.enum(['Sick', 'Vacation', 'Emergency', 'Conference', 'Other']),
})

// Doctor Leave Validation with date validation
export const doctorLeaveSchema = doctorLeaveBaseSchema.refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  }
)

export type PatientInput = z.infer<typeof patientSchema>
export type DoctorInput = z.infer<typeof doctorSchema>
export type UserInput = z.infer<typeof userSchema>
export type AdmissionInput = z.infer<typeof admissionSchema>
export type BillInput = z.infer<typeof billSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type PathologyOrderInput = z.infer<typeof pathologyOrderSchema>
export type PathologyResultInput = z.infer<typeof pathologyResultSchema>
export type MedicalRecordInput = z.infer<typeof medicalRecordSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type ServiceInput = z.infer<typeof serviceSchema>
export type WardInput = z.infer<typeof wardSchema>
export type BedInput = z.infer<typeof bedSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type SettingsInput = z.infer<typeof settingsSchema>

// Pharmacy Module Types
export type PharmacySupplierInput = z.infer<typeof pharmacySupplierSchema>
export type PharmacyCategoryInput = z.infer<typeof pharmacyCategorySchema>
export type PharmacyMedicineInput = z.infer<typeof pharmacyMedicineSchema>
export type PharmacyStockInput = z.infer<typeof pharmacyStockSchema>
export type PharmacySaleInput = z.infer<typeof pharmacySaleSchema>
export type PharmacyStockAdjustmentInput = z.infer<typeof pharmacyStockAdjustmentSchema>

// OPD Module Types
export type OPDRegistrationInput = z.infer<typeof opdRegistrationSchema>
export type OPDConsultationInput = z.infer<typeof opdConsultationSchema>

// Appointment Module Types
export type AppointmentInput = z.infer<typeof appointmentSchema>
export type DoctorAvailabilityInput = z.infer<typeof doctorAvailabilitySchema>
export type DoctorLeaveInput = z.infer<typeof doctorLeaveSchema>
