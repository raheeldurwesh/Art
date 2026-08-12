-- ── Institute Admission Management System Database Schema ──

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Sequences for Auto-generating Numbers
CREATE SEQUENCE IF NOT EXISTS student_admission_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS receipt_no_seq START WITH 5001;
CREATE SEQUENCE IF NOT EXISTS cert_no_seq START WITH 8001;

-- Function to format admission number: ADM-2026-1001
CREATE OR REPLACE FUNCTION generate_admission_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.admission_no IS NULL OR NEW.admission_no = '' THEN
    NEW.admission_no := 'ADM-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(NEXTVAL('student_admission_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to format receipt number: RCT-2026-5001
CREATE OR REPLACE FUNCTION generate_receipt_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_no IS NULL OR NEW.receipt_no = '' THEN
    NEW.receipt_no := 'RCT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(NEXTVAL('receipt_no_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to format certificate number: CERT-2026-8001
CREATE OR REPLACE FUNCTION generate_cert_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_no IS NULL OR NEW.certificate_no = '' THEN
    NEW.certificate_no := 'CERT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(NEXTVAL('cert_no_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Institute Settings Table
CREATE TABLE IF NOT EXISTS public.institute_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'InstituteHub',
  logo_url TEXT,
  address TEXT NOT NULL DEFAULT '123 Skill Development Avenue, Tech City',
  phone TEXT NOT NULL DEFAULT '+91 9876543210',
  email TEXT NOT NULL DEFAULT 'contact@institute.com',
  director_name TEXT NOT NULL DEFAULT 'Director Name',
  director_signature_url TEXT,
  upi_id TEXT DEFAULT 'institute@upi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default settings
INSERT INTO public.institute_settings (id, name, address, phone, email, director_name)
VALUES ('default', 'Skill Development Institute', 'Main Road, Center City', '9876543210', 'info@skillinst.com', 'Dr. A. Sharma')
ON CONFLICT (id) DO NOTHING;

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 3,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Batches Table
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days TEXT[] NOT NULL DEFAULT '{}',
  max_students INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Students Table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admission_no TEXT UNIQUE,
  photo_url TEXT,
  full_name TEXT NOT NULL,
  father_mother_name TEXT NOT NULL,
  student_mobile TEXT NOT NULL,
  parent_mobile TEXT NOT NULL,
  email TEXT,
  dob DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  address TEXT NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id),
  batch_id UUID NOT NULL REFERENCES public.batches(id),
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attach trigger for admission_no
DROP TRIGGER IF EXISTS trigger_generate_admission_no ON public.students;
CREATE TRIGGER trigger_generate_admission_no
BEFORE INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION generate_admission_no();

-- 6. Student Documents Table
CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Fees Table
CREATE TABLE IF NOT EXISTS public.fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID UNIQUE NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  total_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  remaining NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Fee Payments Table
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_id UUID REFERENCES public.fees(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other')),
  receipt_no TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attach trigger for receipt_no
DROP TRIGGER IF EXISTS trigger_generate_receipt_no ON public.fee_payments;
CREATE TRIGGER trigger_generate_receipt_no
BEFORE INSERT ON public.fee_payments
FOR EACH ROW EXECUTE FUNCTION generate_receipt_no();

-- 9. Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  marked_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, batch_id, date)
);

-- 10. Certificates Table
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_no TEXT UNIQUE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attach trigger for cert_no
DROP TRIGGER IF EXISTS trigger_generate_cert_no ON public.certificates;
CREATE TRIGGER trigger_generate_cert_no
BEFORE INSERT ON public.certificates
FOR EACH ROW EXECUTE FUNCTION generate_cert_no();
-- Ensure upi_id column exists if table was created previously
ALTER TABLE public.institute_settings ADD COLUMN IF NOT EXISTS upi_id TEXT DEFAULT 'institute@upi';

-- ── ROW LEVEL SECURITY (RLS) POLICIES ────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.institute_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Create policies for full access (Idempotent policy creation)
DROP POLICY IF EXISTS "Allow public read institute_settings" ON public.institute_settings;
CREATE POLICY "Allow public read institute_settings" ON public.institute_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all institute_settings" ON public.institute_settings;
CREATE POLICY "Allow all institute_settings" ON public.institute_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all courses" ON public.courses;
CREATE POLICY "Allow all courses" ON public.courses FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all batches" ON public.batches;
CREATE POLICY "Allow all batches" ON public.batches FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all students" ON public.students;
CREATE POLICY "Allow all students" ON public.students FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all student_documents" ON public.student_documents;
CREATE POLICY "Allow all student_documents" ON public.student_documents FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all fees" ON public.fees;
CREATE POLICY "Allow all fees" ON public.fees FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all fee_payments" ON public.fee_payments;
CREATE POLICY "Allow all fee_payments" ON public.fee_payments FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all attendance" ON public.attendance;
CREATE POLICY "Allow all attendance" ON public.attendance FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all certificates" ON public.certificates;
CREATE POLICY "Allow all certificates" ON public.certificates FOR ALL USING (true);

-- ── STORAGE BUCKETS ──────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('institute-assets', 'institute-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Student Photos" ON storage.objects;
CREATE POLICY "Public Read Student Photos" ON storage.objects FOR SELECT USING (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "Public Insert Student Photos" ON storage.objects;
CREATE POLICY "Public Insert Student Photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "Public Update Student Photos" ON storage.objects;
CREATE POLICY "Public Update Student Photos" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "Public Read Institute Assets" ON storage.objects;
CREATE POLICY "Public Read Institute Assets" ON storage.objects FOR SELECT USING (bucket_id = 'institute-assets');

DROP POLICY IF EXISTS "Public Insert Institute Assets" ON storage.objects;
CREATE POLICY "Public Insert Institute Assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'institute-assets');

DROP POLICY IF EXISTS "Public Update Institute Assets" ON storage.objects;
CREATE POLICY "Public Update Institute Assets" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'institute-assets');
