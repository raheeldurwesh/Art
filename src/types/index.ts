// ── Enums ──────────────────────────────────────────────────

export type StudentStatus = 'active' | 'completed' | 'dropped' | 'inactive'
export type Gender = 'male' | 'female' | 'other'
export type AttendanceStatus = 'present' | 'absent'
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'card' | 'cheque' | 'other'
export type CourseStatus = 'active' | 'inactive'
export type BatchStatus = 'active' | 'inactive' | 'completed'

// ── Database Models ────────────────────────────────────────

export interface InstituteSettings {
  id: string
  name: string
  logo_url: string | null
  address: string
  phone: string
  email: string
  director_name: string
  director_signature_url: string | null
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  name: string
  duration_months: number
  fee: number
  description: string | null
  status: CourseStatus
  created_at: string
  updated_at: string
}

export interface Batch {
  id: string
  course_id: string
  name: string
  start_time: string
  end_time: string
  days: string[]
  max_students: number
  status: BatchStatus
  created_at: string
  updated_at: string
  // Joined
  course?: Course
  student_count?: number
}

export interface Student {
  id: string
  admission_no: string
  photo_url: string | null
  full_name: string
  father_mother_name: string
  student_mobile: string
  parent_mobile: string
  email: string | null
  dob?: string | null
  gender: Gender
  address: string
  course_id: string
  batch_id: string
  admission_date: string
  status: StudentStatus
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  course?: Course
  batch?: Batch
}

export interface StudentDocument {
  id: string
  student_id: string
  name: string
  file_url: string
  uploaded_at: string
}

export interface Fee {
  id: string
  student_id: string
  total_fee: number
  paid: number
  remaining: number
  created_at: string
  updated_at: string
  // Joined
  student?: Student
}

export interface FeePayment {
  id: string
  fee_id: string
  student_id: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  receipt_no: string
  notes: string | null
  created_at: string
  // Joined
  student?: Student
}

export interface Attendance {
  id: string
  student_id: string
  batch_id: string
  date: string
  status: AttendanceStatus
  marked_by: string | null
  created_at: string
  // Joined
  student?: Student
  batch?: Batch
}

export interface Certificate {
  id: string
  student_id: string
  course_id: string
  certificate_no: string
  issue_date: string
  created_at: string
  // Joined
  student?: Student
  course?: Course
}

// ── Dashboard Types ────────────────────────────────────────

export interface DashboardStats {
  totalStudents: number
  todayAdmissions: number
  pendingFees: number
  totalCourses: number
  activeStudents: number
}

export interface ChartDataPoint {
  label: string
  value: number
}

// ── Search ─────────────────────────────────────────────────

export interface SearchResult {
  id: string
  type: 'student' | 'course' | 'batch'
  title: string
  subtitle: string
  url: string
}
