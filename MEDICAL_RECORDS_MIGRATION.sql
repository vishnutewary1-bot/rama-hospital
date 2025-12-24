-- =====================================================
-- MEDICAL RECORDS TABLE MIGRATION
-- Add this to your Supabase database
-- =====================================================

-- Create Medical Records Table
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL,
    record_type TEXT NOT NULL CHECK (record_type IN (
        'consultation',
        'prescription',
        'progress_note',
        'surgery_note',
        'discharge_summary',
        'investigation',
        'procedure',
        'other'
    )),
    record_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,

    -- Basic Information
    title TEXT,
    content TEXT,

    -- Medical Details
    diagnosis TEXT,
    treatment_plan TEXT,
    prescriptions TEXT,
    follow_up_date DATE,

    -- Vital Signs
    vitals_bp TEXT,
    vitals_pulse INTEGER,
    vitals_temperature DECIMAL(4,1),
    vitals_spo2 INTEGER,
    vitals_weight DECIMAL(5,2),

    -- Attachments (stored as JSON array of file URLs/paths)
    attachments JSONB,

    -- Audit Fields
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes for Better Performance
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_admission ON medical_records(admission_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor ON medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON medical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON medical_records(record_date DESC);

-- Create Updated_at Trigger
CREATE OR REPLACE FUNCTION update_medical_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS medical_records_updated_at ON medical_records;
CREATE TRIGGER medical_records_updated_at
    BEFORE UPDATE ON medical_records
    FOR EACH ROW
    EXECUTE FUNCTION update_medical_records_updated_at();

-- Enable Row Level Security
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Policy: Allow all authenticated users to view medical records
CREATE POLICY "Allow authenticated users to view medical records"
    ON medical_records
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow admins and doctors to insert medical records
CREATE POLICY "Allow admins and doctors to insert medical records"
    ON medical_records
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'doctor')
        )
    );

-- Policy: Allow admins and doctors to update medical records
CREATE POLICY "Allow admins and doctors to update medical records"
    ON medical_records
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'doctor')
        )
    );

-- Policy: Allow only admins to delete medical records
CREATE POLICY "Allow only admins to delete medical records"
    ON medical_records
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Add helpful comments
COMMENT ON TABLE medical_records IS 'Stores all patient medical records including consultations, prescriptions, progress notes, surgery notes, and discharge summaries';
COMMENT ON COLUMN medical_records.record_type IS 'Type of medical record: consultation, prescription, progress_note, surgery_note, discharge_summary, investigation, procedure, other';
COMMENT ON COLUMN medical_records.diagnosis IS 'Medical diagnosis for the patient';
COMMENT ON COLUMN medical_records.treatment_plan IS 'Detailed treatment plan prescribed by the doctor';
COMMENT ON COLUMN medical_records.prescriptions IS 'List of prescribed medications and dosages';
COMMENT ON COLUMN medical_records.follow_up_date IS 'Date when patient should follow up';
COMMENT ON COLUMN medical_records.attachments IS 'JSON array of attachment file references';

-- =====================================================
-- SAMPLE DATA (Optional - Remove in production)
-- =====================================================

-- Insert sample medical records (only if you have sample patients and doctors)
-- This is commented out by default - uncomment if needed
/*
INSERT INTO medical_records (patient_id, record_type, doctor_id, title, content, diagnosis, treatment_plan, created_by)
SELECT
    p.id,
    'consultation',
    d.id,
    'Initial Consultation',
    'Patient presented with complaints of fever and body ache for the past 3 days.',
    'Viral Fever',
    'Rest and supportive care. Antipyretics as needed.',
    u.id
FROM patients p
CROSS JOIN doctors d
CROSS JOIN users u
WHERE p.registration_number = 'REG001'
  AND d.name LIKE '%Dr%'
  AND u.role = 'admin'
LIMIT 1;
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================
