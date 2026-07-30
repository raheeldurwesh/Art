import { z } from 'zod'

export const studentSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  father_mother_name: z.string().min(2, 'Parent name must be at least 2 characters'),
  student_mobile: z
    .string()
    .min(10, 'Mobile number must be at least 10 digits')
    .regex(/^[0-9+\s-]+$/, 'Mobile number must contain valid digits'),
  parent_mobile: z
    .string()
    .min(10, 'Mobile number must be at least 10 digits')
    .regex(/^[0-9+\s-]+$/, 'Mobile number must contain valid digits'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  course_id: z.string().min(1, 'Please select a course'),
  batch_id: z.string().min(1, 'Please select a batch'),
  admission_date: z.string().min(1, 'Admission date is required'),
  status: z.enum(['active', 'completed', 'dropped', 'inactive']).default('active'),
  notes: z.string().optional().or(z.literal('')),
  total_fee: z.coerce.number().min(0, 'Fee must be a positive number'),
  initial_payment: z.coerce.number().min(0, 'Payment must be a positive number').optional(),
  payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other']).optional(),
})

export type StudentFormData = z.infer<typeof studentSchema>

export const courseSchema = z.object({
  name: z.string().min(2, 'Course name must be at least 2 characters'),
  duration_months: z.coerce.number().min(1, 'Duration must be at least 1 month'),
  fee: z.coerce.number().min(0, 'Fee must be a positive number'),
  description: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
})

export type CourseFormData = z.infer<typeof courseSchema>

export const batchSchema = z.object({
  name: z.string().min(2, 'Batch name must be at least 2 characters'),
  course_id: z.string().min(1, 'Please select a course'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  days: z.array(z.string()).min(1, 'Select at least one day'),
  max_students: z.coerce.number().min(1, 'Must allow at least 1 student'),
  status: z.enum(['active', 'inactive', 'completed']).default('active'),
})

export type BatchFormData = z.infer<typeof batchSchema>

export const feePaymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be at least 1'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other'], {
    required_error: 'Payment method is required',
  }),
  notes: z.string().optional().or(z.literal('')),
})

export type FeePaymentFormData = z.infer<typeof feePaymentSchema>

export const settingsSchema = z.object({
  name: z.string().min(2, 'Institute name is required'),
  address: z.string().min(5, 'Address is required'),
  phone: z.string().min(10, 'Phone number is required'),
  email: z.string().email('Invalid email'),
  director_name: z.string().min(2, 'Director name is required'),
})

export type SettingsFormData = z.infer<typeof settingsSchema>

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>
