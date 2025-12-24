// Database Service Layer using Supabase
// This provides a unified interface for all database operations

import { supabase } from './supabase'
import type {
  User, Doctor, Area, Referral, Patient, Admission, Ward, Bed,
  ServiceCategory, Service, Bill, BillItem, Payment,
  ExpenseCategory, Expense, PathologyCategory, PathologyTest,
  PathologyTestParameter, PatientTest, PatientTestResult,
  MedicalRecord, AuditLog, Setting, PrintTemplate, DashboardStats
} from '@/types/database'

// Generate UUID
export const generateUUID = (): string => {
  return crypto.randomUUID()
}

// User Service
export const userService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name')
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    if (error) return null
    return data
  },

  async create(user: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

// Doctor Service
export const doctorService = {
  async getAll(): Promise<Doctor[]> {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('name')
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Doctor | null> {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async create(doctor: Partial<Doctor>): Promise<Doctor> {
    const { data, error } = await supabase
      .from('doctors')
      .insert(doctor)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Doctor>): Promise<Doctor> {
    const { data, error} = await supabase
      .from('doctors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('doctors')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

// Area Service
export const areaService = {
  async getAll(): Promise<Area[]> {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .order('name')
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Area | null> {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  }
}

// Referral Service
export const referralService = {
  async getAll(): Promise<Referral[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .order('name')
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Referral | null> {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  }
}

// Ward Service
export const wardService = {
  async getAll(): Promise<Ward[]> {
    const { data, error } = await supabase
      .from('wards')
      .select('*')
      .order('name')
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Ward | null> {
    const { data, error } = await supabase
      .from('wards')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async create(ward: Partial<Ward>): Promise<Ward> {
    const { data, error } = await supabase
      .from('wards')
      .insert(ward)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// Bed Service
export const bedService = {
  async getAll(): Promise<Bed[]> {
    const { data, error } = await supabase
      .from('beds')
      .select('*, ward:wards(*)')
      .order('bed_number')
    if (error) throw error
    return data || []
  },

  async getByWardId(wardId: string): Promise<Bed[]> {
    const { data, error } = await supabase
      .from('beds')
      .select('*')
      .eq('ward_id', wardId)
      .order('bed_number')
    if (error) throw error
    return data || []
  },

  async create(bed: Partial<Bed>): Promise<Bed> {
    const { data, error } = await supabase
      .from('beds')
      .insert(bed)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// Patient Service
export const patientService = {
  async getAll(): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*, area:areas(*), referral:referrals(*)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*, area:areas(*), referral:referrals(*)')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async search(query: string): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`name.ilike.%${query}%,mobile.ilike.%${query}%,registration_number.ilike.%${query}%`)
      .limit(20)
    if (error) throw error
    return data || []
  },

  async create(patient: Partial<Patient>): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .insert(patient)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Patient>): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// Admission Service
export const admissionService = {
  async getAll(): Promise<Admission[]> {
    const { data, error } = await supabase
      .from('admissions')
      .select(`
        *,
        patient:patients(*),
        doctor:doctors(*),
        ward:wards(*),
        bed:beds(*)
      `)
      .order('admission_date', { ascending: false })
      .limit(100)
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Admission | null> {
    const { data, error } = await supabase
      .from('admissions')
      .select(`
        *,
        patient:patients(*),
        doctor:doctors(*),
        ward:wards(*),
        bed:beds(*)
      `)
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async getByPatientId(patientId: string): Promise<Admission[]> {
    const { data, error } = await supabase
      .from('admissions')
      .select(`
        *,
        doctor:doctors(*),
        ward:wards(*),
        bed:beds(*)
      `)
      .eq('patient_id', patientId)
      .order('admission_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Admission[]> {
    const { data, error } = await supabase
      .from('admissions')
      .select('*, patient:patients(*), doctor:doctors(*)')
      .gte('admission_date', startDate)
      .lte('admission_date', endDate)
    if (error) throw error
    return data || []
  },

  async create(admission: Partial<Admission>): Promise<Admission> {
    const { data, error } = await supabase
      .from('admissions')
      .insert(admission)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async discharge(id: string, updates: Partial<Admission>): Promise<Admission> {
    const { data, error } = await supabase
      .from('admissions')
      .update({
        ...updates,
        discharge_date: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// Service Category Service
export const serviceCategoryService = {
  async getAll(): Promise<ServiceCategory[]> {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .order('sort_order')
    if (error) throw error
    return data || []
  }
}

// Service Service
export const serviceService = {
  async getAll(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*, category:service_categories(*)')
      .order('name')
    if (error) throw error
    return data || []
  },

  async getByCategoryId(categoryId: string): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('category_id', categoryId)
      .order('name')
    if (error) throw error
    return data || []
  }
}

// Bill Service
export const billService = {
  async getAll(): Promise<Bill[]> {
    const { data, error } = await supabase
      .from('bills')
      .select(`
        *,
        patient:patients(*),
        admission:admissions(*)
      `)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Bill | null> {
    const { data, error } = await supabase
      .from('bills')
      .select(`
        *,
        patient:patients(*),
        admission:admissions(*)
      `)
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async getByAdmissionId(admissionId: string): Promise<Bill | null> {
    const { data, error } = await supabase
      .from('bills')
      .select(`
        *,
        patient:patients(*),
        admission:admissions(*)
      `)
      .eq('admission_id', admissionId)
      .single()
    if (error) return null
    return data
  },

  async getByPatientId(patientId: string): Promise<Bill[]> {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('patient_id', patientId)
      .order('bill_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Bill[]> {
    const { data, error } = await supabase
      .from('bills')
      .select('*, patient:patients(*), admission:admissions(*)')
      .gte('bill_date', startDate)
      .lte('bill_date', endDate)
    if (error) throw error
    return data || []
  },

  async create(bill: Partial<Bill>): Promise<Bill> {
    const { data, error } = await supabase
      .from('bills')
      .insert(bill)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Bill>): Promise<Bill> {
    const { data, error } = await supabase
      .from('bills')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// Bill Item Service
export const billItemService = {
  async getByBillId(billId: string): Promise<BillItem[]> {
    const { data, error } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', billId)
      .order('created_at')
    if (error) throw error
    return data || []
  },

  async getByDateRange(startDate: string, endDate: string): Promise<BillItem[]> {
    const { data, error } = await supabase
      .from('bill_items')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
    if (error) throw error
    return data || []
  },

  async create(item: Partial<BillItem>): Promise<BillItem> {
    const { data, error } = await supabase
      .from('bill_items')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('bill_items')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

// Payment Service
export const paymentService = {
  async getAll(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getByBillId(billId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('bill_id', billId)
      .order('payment_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
    if (error) throw error
    return data || []
  },

  async create(payment: Partial<Payment>): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// Expense Category Service
export const expenseCategoryService = {
  async getAll(): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name')
    if (error) throw error
    return data || []
  }
}

// Expense Service
export const expenseService = {
  async getAll(): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:expense_categories(*)')
      .order('expense_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:expense_categories(*)')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
    if (error) throw error
    return data || []
  },

  async create(expense: Partial<Expense>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert(expense)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// Pathology Service
export const pathologyService = {
  async getAllCategories(): Promise<PathologyCategory[]> {
    const { data, error } = await supabase
      .from('pathology_categories')
      .select('*')
      .order('name')
    if (error) throw error
    return data || []
  },

  async getAllTests(): Promise<PathologyTest[]> {
    const { data, error } = await supabase
      .from('pathology_tests')
      .select('*, category:pathology_categories(*)')
      .order('name')
    if (error) throw error
    return data || []
  },

  async getTestsByPatientId(patientId: string): Promise<PatientTest[]> {
    const { data, error } = await supabase
      .from('patient_tests')
      .select('*, patient:patients(*), test:pathology_tests(*)')
      .eq('patient_id', patientId)
      .order('order_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async createTest(test: Partial<PatientTest>): Promise<PatientTest> {
    const { data, error } = await supabase
      .from('patient_tests')
      .insert(test)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// Pathology Category Service
export const pathologyCategoryService = {
  async getAll(): Promise<PathologyCategory[]> {
    const { data, error } = await supabase
      .from('pathology_categories')
      .select('*')
      .order('name')
    if (error) throw error
    return data || []
  },

  async create(category: Partial<PathologyCategory>): Promise<PathologyCategory> {
    const { data, error } = await supabase
      .from('pathology_categories')
      .insert(category)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<PathologyCategory>): Promise<PathologyCategory> {
    const { data, error } = await supabase
      .from('pathology_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('pathology_categories')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

// Pathology Test Service
export const pathologyTestService = {
  async getAll(): Promise<PathologyTest[]> {
    const { data, error } = await supabase
      .from('pathology_tests')
      .select('*, category:pathology_categories(*)')
      .order('name')
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<PathologyTest | null> {
    const { data, error } = await supabase
      .from('pathology_tests')
      .select('*, category:pathology_categories(*)')
      .eq('id', id)
      .single()
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  async create(test: Partial<PathologyTest>): Promise<PathologyTest> {
    const { data, error } = await supabase
      .from('pathology_tests')
      .insert(test)
      .select('*, category:pathology_categories(*)')
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<PathologyTest>): Promise<PathologyTest> {
    const { data, error } = await supabase
      .from('pathology_tests')
      .update(updates)
      .eq('id', id)
      .select('*, category:pathology_categories(*)')
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('pathology_tests')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

// Patient Test Service
export const patientTestService = {
  async getAll(): Promise<PatientTest[]> {
    const { data, error } = await supabase
      .from('patient_tests')
      .select('*, patient:patients(*), test:pathology_tests(*, category:pathology_categories(*))')
      .order('order_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<PatientTest | null> {
    const { data, error } = await supabase
      .from('patient_tests')
      .select('*, patient:patients(*), test:pathology_tests(*, category:pathology_categories(*))')
      .eq('id', id)
      .single()
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  async getByPatientId(patientId: string): Promise<PatientTest[]> {
    const { data, error } = await supabase
      .from('patient_tests')
      .select('*, test:pathology_tests(*, category:pathology_categories(*))')
      .eq('patient_id', patientId)
      .order('order_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async create(test: Partial<PatientTest>): Promise<PatientTest> {
    const { data, error } = await supabase
      .from('patient_tests')
      .insert(test)
      .select('*, patient:patients(*), test:pathology_tests(*, category:pathology_categories(*))')
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<PatientTest>): Promise<PatientTest> {
    const { data, error } = await supabase
      .from('patient_tests')
      .update(updates)
      .eq('id', id)
      .select('*, patient:patients(*), test:pathology_tests(*, category:pathology_categories(*))')
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('patient_tests')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

// Patient Test Result Service
export const patientTestResultService = {
  async getByTestId(testId: string): Promise<PatientTestResult[]> {
    const { data, error } = await supabase
      .from('patient_test_results')
      .select('*')
      .eq('patient_test_id', testId)
      .order('parameter_name')
    if (error) throw error
    return data || []
  },

  async create(result: Partial<PatientTestResult>): Promise<PatientTestResult> {
    const { data, error } = await supabase
      .from('patient_test_results')
      .insert(result)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<PatientTestResult>): Promise<PatientTestResult> {
    const { data, error } = await supabase
      .from('patient_test_results')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('patient_test_results')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async bulkCreate(results: Partial<PatientTestResult>[]): Promise<PatientTestResult[]> {
    const { data, error } = await supabase
      .from('patient_test_results')
      .insert(results)
      .select()
    if (error) throw error
    return data || []
  }
}

// Medical Record Service
export const medicalRecordService = {
  async getAll(): Promise<MedicalRecord[]> {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*, patient:patients(*), doctor:doctors(*), admission:admissions(*)')
      .order('record_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<MedicalRecord | null> {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*, patient:patients(*), doctor:doctors(*), admission:admissions(*)')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async getByPatientId(patientId: string): Promise<MedicalRecord[]> {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*, doctor:doctors(*), admission:admissions(*)')
      .eq('patient_id', patientId)
      .order('record_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getByAdmissionId(admissionId: string): Promise<MedicalRecord[]> {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*, doctor:doctors(*)')
      .eq('admission_id', admissionId)
      .order('record_date', { ascending: false })
    if (error) throw error
    return data || []
  },

  async create(record: Partial<MedicalRecord>): Promise<MedicalRecord> {
    const { data, error } = await supabase
      .from('medical_records')
      .insert(record)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<MedicalRecord>): Promise<MedicalRecord> {
    const { data, error } = await supabase
      .from('medical_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('medical_records')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

// Dashboard Service
export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    // Get active admissions count
    const { count: activeAdmissions } = await supabase
      .from('admissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active')

    // Get today's admissions
    const today = new Date().toISOString().split('T')[0]
    const { count: todaysAdmissions } = await supabase
      .from('admissions')
      .select('*', { count: 'exact', head: true })
      .gte('admission_date', today)

    // Get today's collection
    const { data: todaysPayments } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', today)

    const todaysCollection = todaysPayments?.reduce((sum, p) => sum + p.amount, 0) || 0

    // Get pending bills total
    const { data: pendingBills } = await supabase
      .from('bills')
      .select('net_amount, amount_received')
      .neq('status', 'Paid')

    const pendingAmount = pendingBills?.reduce((sum, b) => sum + (b.net_amount - b.amount_received), 0) || 0

    return {
      totalPatients: 0, // TODO: Implement total patients count
      activeAdmissions: activeAdmissions || 0,
      todayAdmissions: todaysAdmissions || 0,
      todayCollection: todaysCollection,
      pendingAmount,
      totalDoctors: 0, // TODO: Implement total doctors count
      todayExpenses: 0, // TODO: Implement today's expenses
      availableBeds: 0, // TODO: Implement bed availability query
      occupiedBeds: 0,
      pendingTests: 0 // TODO: Implement pending tests count
    }
  }
}

// Audit Log Service
export const auditLogService = {
  async create(log: Partial<AuditLog>): Promise<AuditLog> {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(log)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getByUserId(userId: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return data || []
  }
}

// Settings Service
export const settingsService = {
  async getAll(): Promise<Setting[]> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
    if (error) throw error
    return data || []
  },

  async get(key: string): Promise<Setting | null> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', key)
      .single()
    if (error) return null
    return data
  },

  async set(key: string, value: string): Promise<Setting> {
    const { data, error } = await supabase
      .from('settings')
      .upsert({ key, value })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// Print Template Service
export const printTemplateService = {
  async getAll(): Promise<PrintTemplate[]> {
    const { data, error } = await supabase
      .from('print_templates')
      .select('*')
      .order('name')
    if (error) throw error
    return data || []
  }
}

// Backup Service (Note: This requires server-side implementation)
export const backupService = {
  async create(): Promise<{ success: boolean; path?: string; error?: string }> {
    // This would need to be implemented on the backend
    return { success: false, error: 'Backup functionality requires backend implementation' }
  },

  async restore(path: string): Promise<{ success: boolean; error?: string }> {
    // This would need to be implemented on the backend
    return { success: false, error: 'Restore functionality requires backend implementation' }
  }
}
