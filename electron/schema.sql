-- Rama Hospital Management System - SQLite Schema
-- This schema is designed for offline-first operation with better-sqlite3

-- ==================== CORE TABLES ====================

-- Users table (replaces Supabase auth)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'worker', 'billing', 'doctor', 'pathology')),
    phone TEXT,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Areas (geographic regions)
CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    pincode TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Referrals (patient referral sources)
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('Doctor', 'Staff', 'Patient', 'Advertisement', 'Other')),
    phone TEXT,
    commission_percentage REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Doctors
CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    name TEXT NOT NULL,
    specialization TEXT,
    qualification TEXT,
    phone TEXT,
    email TEXT,
    consultation_fee REAL DEFAULT 0,
    follow_up_fee REAL DEFAULT 0,
    is_visiting INTEGER DEFAULT 0,
    visit_days TEXT,
    visit_timings TEXT,
    opd_days TEXT,
    opd_timings TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    commission_percentage REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ==================== PATIENT & ADMISSION ====================

-- Patients
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    registration_number TEXT UNIQUE,
    name TEXT NOT NULL,
    age INTEGER,
    age_unit TEXT DEFAULT 'years' CHECK (age_unit IN ('years', 'months', 'days')),
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    date_of_birth TEXT,
    mobile TEXT,
    alternate_mobile TEXT,
    email TEXT,
    address TEXT,
    area_id TEXT REFERENCES areas(id),
    pincode TEXT,
    blood_group TEXT,
    referral_id TEXT REFERENCES referrals(id),
    photo TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    medical_alerts TEXT,
    allergies TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Wards
CREATE TABLE IF NOT EXISTS wards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('General', 'Semi-Private', 'Private', 'ICU', 'NICU', 'PICU', 'CCU', 'Emergency', 'Maternity', 'Pediatric', 'Surgical', 'Isolation')),
    floor TEXT,
    total_beds INTEGER DEFAULT 0,
    daily_rate REAL DEFAULT 0,
    nursing_charge REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Beds
CREATE TABLE IF NOT EXISTS beds (
    id TEXT PRIMARY KEY,
    ward_id TEXT NOT NULL REFERENCES wards(id),
    bed_number TEXT NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
    current_admission_id TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(ward_id, bed_number)
);

-- Admissions
CREATE TABLE IF NOT EXISTS admissions (
    id TEXT PRIMARY KEY,
    admission_number TEXT UNIQUE,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    doctor_id TEXT REFERENCES doctors(id),
    ward_id TEXT REFERENCES wards(id),
    bed_id TEXT REFERENCES beds(id),
    ward_type TEXT,
    admission_date TEXT DEFAULT (datetime('now')),
    discharge_date TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Discharged', 'LAMA', 'Transferred', 'Deceased')),
    diagnosis TEXT,
    chief_complaints TEXT,
    discharge_summary TEXT,
    caretaker_name TEXT,
    caretaker_mobile TEXT,
    caretaker_relation TEXT,
    is_mlc INTEGER DEFAULT 0,
    mlc_number TEXT,
    police_station TEXT,
    brought_by TEXT,
    has_insurance INTEGER DEFAULT 0,
    insurance_company TEXT,
    insurance_policy_number TEXT,
    insurance_amount REAL DEFAULT 0,
    vitals_bp TEXT,
    vitals_pulse INTEGER,
    vitals_temperature REAL,
    vitals_spo2 INTEGER,
    vitals_weight REAL,
    vitals_height REAL,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ==================== PATHOLOGY ====================

-- Pathology Test Categories
CREATE TABLE IF NOT EXISTS pathology_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Pathology Tests
CREATE TABLE IF NOT EXISTS pathology_tests (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES pathology_categories(id),
    name TEXT NOT NULL,
    short_name TEXT,
    method TEXT,
    sample_type TEXT,
    sample_volume TEXT,
    container_type TEXT,
    reporting_time TEXT,
    price REAL DEFAULT 0,
    cost REAL DEFAULT 0,
    is_outsourced INTEGER DEFAULT 0,
    outsource_lab TEXT,
    outsource_cost REAL DEFAULT 0,
    is_package INTEGER DEFAULT 0,
    package_tests TEXT,
    interpretation TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Test Parameters
CREATE TABLE IF NOT EXISTS pathology_test_parameters (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL REFERENCES pathology_tests(id),
    name TEXT NOT NULL,
    unit TEXT,
    normal_range_male TEXT,
    normal_range_female TEXT,
    normal_range_child TEXT,
    critical_low REAL,
    critical_high REAL,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Patient Test Orders
CREATE TABLE IF NOT EXISTS patient_tests (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    admission_id TEXT REFERENCES admissions(id),
    test_id TEXT NOT NULL REFERENCES pathology_tests(id),
    doctor_id TEXT REFERENCES doctors(id),
    ordered_by TEXT REFERENCES users(id),
    order_date TEXT DEFAULT (datetime('now')),
    priority TEXT DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'stat')),
    sample_collected INTEGER DEFAULT 0,
    sample_collected_at TEXT,
    sample_collected_by TEXT REFERENCES users(id),
    sample_barcode TEXT,
    status TEXT DEFAULT 'ordered' CHECK (status IN ('ordered', 'sample_collected', 'processing', 'completed', 'verified', 'cancelled')),
    result_entered_at TEXT,
    result_entered_by TEXT REFERENCES users(id),
    verified_at TEXT,
    verified_by TEXT REFERENCES users(id),
    notes TEXT,
    bill_id TEXT REFERENCES bills(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Patient Test Results
CREATE TABLE IF NOT EXISTS patient_test_results (
    id TEXT PRIMARY KEY,
    patient_test_id TEXT NOT NULL REFERENCES patient_tests(id),
    parameter_id TEXT NOT NULL REFERENCES pathology_test_parameters(id),
    value TEXT,
    is_abnormal INTEGER DEFAULT 0,
    is_critical INTEGER DEFAULT 0,
    remarks TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ==================== MEDICAL RECORDS ====================

-- Medical Records
CREATE TABLE IF NOT EXISTS medical_records (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    admission_id TEXT REFERENCES admissions(id),
    record_type TEXT NOT NULL CHECK (record_type IN ('consultation', 'prescription', 'progress_note', 'surgery_note', 'discharge_summary', 'investigation', 'procedure', 'other')),
    record_date TEXT DEFAULT (datetime('now')),
    doctor_id TEXT REFERENCES doctors(id),
    title TEXT,
    content TEXT,
    vitals_bp TEXT,
    vitals_pulse INTEGER,
    vitals_temperature REAL,
    vitals_spo2 INTEGER,
    vitals_weight REAL,
    attachments TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ==================== BILLING ====================

-- Service Categories
CREATE TABLE IF NOT EXISTS service_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Services
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES service_categories(id),
    name TEXT NOT NULL,
    unit_type TEXT DEFAULT 'fixed' CHECK (unit_type IN ('fixed', 'per_day', 'per_hour', 'per_unit')),
    price REAL DEFAULT 0,
    cost REAL DEFAULT 0,
    hsn_code TEXT,
    tax_percentage REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Bills
CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT UNIQUE,
    bill_type TEXT DEFAULT 'IPD' CHECK (bill_type IN ('OPD', 'IPD', 'Pathology', 'Emergency', 'Pharmacy')),
    patient_id TEXT NOT NULL REFERENCES patients(id),
    admission_id TEXT REFERENCES admissions(id),
    doctor_id TEXT REFERENCES doctors(id),
    bill_date TEXT DEFAULT (datetime('now')),
    total_amount REAL DEFAULT 0,
    discount_percentage REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    discount_reason TEXT,
    discount_approved_by TEXT REFERENCES users(id),
    tax_amount REAL DEFAULT 0,
    net_amount REAL DEFAULT 0,
    amount_received REAL DEFAULT 0,
    amount_due REAL DEFAULT 0,
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Partial', 'Paid', 'Cancelled')),
    notes TEXT,
    internal_notes TEXT,
    finalized_at TEXT,
    finalized_by TEXT REFERENCES users(id),
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Bill Items
CREATE TABLE IF NOT EXISTS bill_items (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    service_id TEXT REFERENCES services(id),
    service_name TEXT NOT NULL,
    unit_price REAL DEFAULT 0,
    quantity REAL DEFAULT 1,
    discount_percentage REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    tax_percentage REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    payment_number TEXT UNIQUE,
    bill_id TEXT NOT NULL REFERENCES bills(id),
    amount REAL NOT NULL,
    payment_date TEXT DEFAULT (datetime('now')),
    payment_mode TEXT CHECK (payment_mode IN ('Cash', 'Card', 'UPI', 'NEFT', 'RTGS', 'Cheque', 'Insurance', 'Online', 'Wallet')),
    transaction_reference TEXT,
    cheque_number TEXT,
    cheque_date TEXT,
    cheque_bank TEXT,
    card_last_digits TEXT,
    received_by TEXT REFERENCES users(id),
    receipt_printed INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ==================== EXPENSES ====================

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    budget_limit REAL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    expense_number TEXT UNIQUE,
    category_id TEXT REFERENCES expense_categories(id),
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date TEXT DEFAULT (datetime('now')),
    payment_mode TEXT CHECK (payment_mode IN ('Cash', 'Card', 'UPI', 'NEFT', 'RTGS', 'Cheque', 'Online')),
    vendor_name TEXT,
    vendor_contact TEXT,
    invoice_number TEXT,
    invoice_date TEXT,
    is_recurring INTEGER DEFAULT 0,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    requires_approval INTEGER DEFAULT 0,
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    attachments TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ==================== AUDIT & SETTINGS ====================

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    description TEXT,
    updated_by TEXT REFERENCES users(id),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(category, key)
);

-- Print Templates
CREATE TABLE IF NOT EXISTS print_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bill', 'receipt', 'discharge_summary', 'lab_report', 'patient_card', 'prescription', 'opd_slip')),
    template TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Number Sequences (for auto-numbering)
CREATE TABLE IF NOT EXISTS number_sequences (
    id TEXT PRIMARY KEY,
    prefix TEXT NOT NULL,
    year INTEGER NOT NULL,
    current_number INTEGER DEFAULT 0,
    UNIQUE(prefix, year)
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_patients_registration ON patients(registration_number);
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_admissions_number ON admissions(admission_number);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_date ON admissions(admission_date);
CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_admission ON bills(admission_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_patient_tests_patient ON patient_tests(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_tests_status ON patient_tests(status);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_beds_ward ON beds(ward_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);

-- ==================== INITIAL DATA ====================

-- Default Admin User (password: admin123)
INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@ramahospital.com', '$2a$10$rQnM1RkGe6yHgQOtJXnEJuPqD5VZU.lHjEFHQZuHf3ySE3bKxNsHe', 'Administrator', 'admin', 1);

-- Default Areas
INSERT OR IGNORE INTO areas (id, name, pincode) VALUES
('area-001', 'City Center', '000001'),
('area-002', 'North Zone', '000002'),
('area-003', 'South Zone', '000003'),
('area-004', 'East Zone', '000004'),
('area-005', 'West Zone', '000005');

-- Default Wards
INSERT OR IGNORE INTO wards (id, name, type, floor, total_beds, daily_rate, nursing_charge) VALUES
('ward-001', 'General Ward A', 'General', 'Ground Floor', 20, 500, 200),
('ward-002', 'General Ward B', 'General', 'First Floor', 20, 500, 200),
('ward-003', 'Semi-Private Ward', 'Semi-Private', 'First Floor', 10, 1000, 300),
('ward-004', 'Private Ward', 'Private', 'Second Floor', 5, 2000, 500),
('ward-005', 'ICU', 'ICU', 'Ground Floor', 8, 5000, 1000),
('ward-006', 'NICU', 'NICU', 'First Floor', 5, 6000, 1200),
('ward-007', 'Emergency Ward', 'Emergency', 'Ground Floor', 10, 1500, 400),
('ward-008', 'Maternity Ward', 'Maternity', 'Second Floor', 10, 1500, 400);

-- Default Service Categories
INSERT OR IGNORE INTO service_categories (id, name, display_order) VALUES
('cat-001', 'Surgeries / Operations', 1),
('cat-002', 'Abscess & Cyst', 2),
('cat-003', 'Urology / Kidney', 3),
('cat-004', 'Orthopedic / Trauma', 4),
('cat-005', 'Ward / Room Charges', 5),
('cat-006', 'Doctor Fees / Consultation', 6),
('cat-007', 'Lab Tests / Diagnostics', 7),
('cat-008', 'Procedures / Treatments', 8),
('cat-009', 'ICU / Critical Care', 9),
('cat-010', 'Medicines / Injections', 10),
('cat-011', 'Dressing / Wound Care', 11),
('cat-012', 'Maternity / Gynecology', 12),
('cat-013', 'Miscellaneous / Admin', 13);

-- Default Expense Categories
INSERT OR IGNORE INTO expense_categories (id, name) VALUES
('exp-001', 'Salary'),
('exp-002', 'Electricity'),
('exp-003', 'Rent'),
('exp-004', 'Maintenance'),
('exp-005', 'Medical Supplies'),
('exp-006', 'Equipment'),
('exp-007', 'Medicine'),
('exp-008', 'Cleaning'),
('exp-009', 'Security'),
('exp-010', 'Other');

-- Default Pathology Categories
INSERT OR IGNORE INTO pathology_categories (id, name, display_order) VALUES
('pcat-001', 'Hematology', 1),
('pcat-002', 'Biochemistry', 2),
('pcat-003', 'Serology', 3),
('pcat-004', 'Microbiology', 4),
('pcat-005', 'Urine Analysis', 5),
('pcat-006', 'Stool Analysis', 6),
('pcat-007', 'Hormones', 7),
('pcat-008', 'Thyroid Profile', 8),
('pcat-009', 'Cardiac Markers', 9),
('pcat-010', 'Diabetes Profile', 10),
('pcat-011', 'Liver Function', 11),
('pcat-012', 'Kidney Function', 12),
('pcat-013', 'Lipid Profile', 13),
('pcat-014', 'Special Tests', 14);

-- Default Pathology Tests
INSERT OR IGNORE INTO pathology_tests (id, category_id, name, short_name, sample_type, price) VALUES
('ptest-001', 'pcat-001', 'Complete Blood Count', 'CBC', 'Blood', 300),
('ptest-002', 'pcat-001', 'Hemoglobin', 'Hb', 'Blood', 100),
('ptest-003', 'pcat-001', 'Platelet Count', 'PLT', 'Blood', 150),
('ptest-004', 'pcat-001', 'ESR', 'ESR', 'Blood', 100),
('ptest-005', 'pcat-001', 'Blood Group & Rh', 'BG', 'Blood', 150),
('ptest-006', 'pcat-002', 'Blood Sugar Fasting', 'BSF', 'Blood', 80),
('ptest-007', 'pcat-002', 'Blood Sugar PP', 'BSPP', 'Blood', 80),
('ptest-008', 'pcat-002', 'Blood Sugar Random', 'BSR', 'Blood', 80),
('ptest-009', 'pcat-002', 'HbA1c', 'HbA1c', 'Blood', 500),
('ptest-010', 'pcat-011', 'Liver Function Test', 'LFT', 'Blood', 600),
('ptest-011', 'pcat-012', 'Kidney Function Test', 'KFT', 'Blood', 600),
('ptest-012', 'pcat-013', 'Lipid Profile', 'Lipid', 'Blood', 700),
('ptest-013', 'pcat-008', 'Thyroid Profile', 'TFT', 'Blood', 800),
('ptest-014', 'pcat-005', 'Urine Routine', 'Urine R/E', 'Urine', 100),
('ptest-015', 'pcat-003', 'Widal Test', 'Widal', 'Blood', 200),
('ptest-016', 'pcat-003', 'Dengue NS1', 'NS1', 'Blood', 600),
('ptest-017', 'pcat-003', 'Malaria Antigen', 'MP', 'Blood', 300),
('ptest-018', 'pcat-002', 'Serum Creatinine', 'Creat', 'Blood', 150),
('ptest-019', 'pcat-002', 'Blood Urea', 'Urea', 'Blood', 150),
('ptest-020', 'pcat-002', 'Serum Uric Acid', 'Uric Acid', 'Blood', 150);

-- Default Settings
INSERT OR IGNORE INTO settings (id, category, key, value, description) VALUES
('set-001', 'hospital', 'name', 'Rama Hospital', 'Hospital Name'),
('set-002', 'hospital', 'address', '', 'Hospital Address'),
('set-003', 'hospital', 'phone', '', 'Hospital Phone'),
('set-004', 'hospital', 'email', '', 'Hospital Email'),
('set-005', 'hospital', 'logo', '', 'Hospital Logo Path'),
('set-006', 'billing', 'patient_prefix', 'RH', 'Patient ID Prefix'),
('set-007', 'billing', 'admission_prefix', 'ADM', 'Admission Number Prefix'),
('set-008', 'billing', 'bill_prefix', 'BILL', 'Bill Number Prefix'),
('set-009', 'billing', 'payment_prefix', 'PAY', 'Payment Number Prefix'),
('set-010', 'billing', 'test_prefix', 'LAB', 'Lab Test Order Prefix'),
('set-011', 'billing', 'tax_enabled', 'false', 'Enable Tax on Bills'),
('set-012', 'billing', 'tax_percentage', '18', 'Default Tax Percentage'),
('set-013', 'billing', 'discount_limit', '10', 'Max Discount % without Approval'),
('set-014', 'backup', 'auto_backup', 'true', 'Enable Auto Backup'),
('set-015', 'backup', 'backup_frequency', 'daily', 'Backup Frequency'),
('set-016', 'backup', 'backup_retention_days', '30', 'Days to Keep Backups');

-- Initialize Number Sequences for current year
INSERT OR IGNORE INTO number_sequences (id, prefix, year, current_number) VALUES
('seq-patient', 'RH', strftime('%Y', 'now'), 0),
('seq-admission', 'ADM', strftime('%Y', 'now'), 0),
('seq-bill', 'BILL', strftime('%Y', 'now'), 0),
('seq-payment', 'PAY', strftime('%Y', 'now'), 0),
('seq-test', 'LAB', strftime('%Y', 'now'), 0),
('seq-expense', 'EXP', strftime('%Y', 'now'), 0);
