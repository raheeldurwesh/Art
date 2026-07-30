import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { studentSchema, type StudentFormData } from '@/schemas'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Course, Batch } from '@/types'

export default function NewAdmissionPage() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [existingFeePaid, setExistingFeePaid] = useState(0)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      status: 'active',
      admission_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
    },
  })

  const selectedCourseId = watch('course_id')
  const selectedBatchId = watch('batch_id')
  const selectedGender = watch('gender')
  const selectedStatus = watch('status')

  useEffect(() => {
    fetchInitialData()
  }, [id])

  useEffect(() => {
    if (selectedCourseId) {
      const filtered = batches.filter((b) => b.course_id === selectedCourseId)
      setFilteredBatches(filtered)

      // Auto-fill fee from course ONLY on new admission creation
      if (!isEditing) {
        const course = courses.find((c) => c.id === selectedCourseId)
        if (course) {
          setValue('total_fee', course.fee)
        }
      }
    } else {
      setFilteredBatches([])
    }
  }, [selectedCourseId, batches, courses, setValue, isEditing])

  async function fetchInitialData() {
    const [{ data: coursesData }, { data: batchesData }] = await Promise.all([
      supabase.from('courses').select('*').order('name'),
      supabase.from('batches').select('*').order('name'),
    ])
    const loadedCourses = (coursesData as Course[]) || []
    const loadedBatches = (batchesData as Batch[]) || []
    setCourses(loadedCourses)
    setBatches(loadedBatches)

    if (id) {
      const { data: student, error } = await supabase
        .from('students')
        .select('*, fee:fees(*)')
        .eq('id', id)
        .single()

      if (error || !student) {
        toast.error('Student not found')
        navigate('/students')
        return
      }

      const feeData = Array.isArray(student.fee) ? student.fee[0] : student.fee

      reset({
        full_name: student.full_name,
        father_mother_name: student.father_mother_name,
        student_mobile: student.student_mobile,
        parent_mobile: student.parent_mobile,
        email: student.email || '',
        dob: student.dob,
        gender: student.gender,
        address: student.address,
        course_id: student.course_id,
        batch_id: student.batch_id,
        admission_date: student.admission_date,
        status: student.status,
        notes: student.notes || '',
        total_fee: feeData?.total_fee || 0,
        initial_payment: 0,
        payment_method: 'cash',
      })

      if (feeData) {
        setExistingFeePaid(feeData.paid || 0)
      }

      if (student.photo_url) {
        setPhotoPreview(student.photo_url)
        setExistingPhotoUrl(student.photo_url)
      }
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  function removePhoto() {
    setPhoto(null)
    setPhotoPreview(null)
    setExistingPhotoUrl(null)
  }

  async function onSubmit(data: StudentFormData) {
    setSubmitting(true)
    try {
      let photo_url: string | null = existingPhotoUrl

      if (photo) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(fileName, photo)

        if (uploadError) {
          toast.error('Failed to upload photo')
          setSubmitting(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('student-photos')
          .getPublicUrl(fileName)
        photo_url = urlData.publicUrl
      }

      if (isEditing && id) {
        const { error: updateError } = await supabase
          .from('students')
          .update({
            full_name: data.full_name,
            father_mother_name: data.father_mother_name,
            student_mobile: data.student_mobile,
            parent_mobile: data.parent_mobile,
            email: data.email || null,
            dob: data.dob,
            gender: data.gender,
            address: data.address,
            course_id: data.course_id,
            batch_id: data.batch_id,
            admission_date: data.admission_date,
            status: data.status,
            notes: data.notes || null,
            photo_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (updateError) throw updateError

        const newRemaining = Math.max(0, data.total_fee - existingFeePaid)
        await supabase
          .from('fees')
          .update({
            total_fee: data.total_fee,
            remaining: newRemaining,
            updated_at: new Date().toISOString(),
          })
          .eq('student_id', id)

        toast.success('Student details updated successfully!')
        navigate(`/students/${id}`)
      } else {
        const { data: student, error: studentError } = await supabase
          .from('students')
          .insert({
            full_name: data.full_name,
            father_mother_name: data.father_mother_name,
            student_mobile: data.student_mobile,
            parent_mobile: data.parent_mobile,
            email: data.email || null,
            dob: data.dob,
            gender: data.gender,
            address: data.address,
            course_id: data.course_id,
            batch_id: data.batch_id,
            admission_date: data.admission_date,
            status: data.status,
            notes: data.notes || null,
            photo_url,
          })
          .select()
          .single()

        if (studentError) throw studentError

        const initialPayment = data.initial_payment || 0
        const { error: feeError } = await supabase.from('fees').insert({
          student_id: student.id,
          total_fee: data.total_fee,
          paid: initialPayment,
          remaining: data.total_fee - initialPayment,
        })

        if (feeError) throw feeError

        if (initialPayment > 0) {
          await supabase.from('fee_payments').insert({
            fee_id: student.id,
            student_id: student.id,
            amount: initialPayment,
            payment_date: data.admission_date,
            payment_method: data.payment_method || 'cash',
            notes: 'Initial payment at admission',
          })
        }

        toast.success(`Student admitted successfully! Admission No: ${student.admission_no}`)
        navigate(`/students/${student.id}`)
      }
    } catch (error) {
      console.error('Save student error:', error)
      toast.error('Failed to save student details. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditing ? 'Edit Student' : 'New Admission'}
        description={isEditing ? 'Update student information and course settings' : 'Register a new student admission'}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input id="full_name" placeholder="Enter student name" {...register('full_name')} />
                      {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="father_mother_name">Father/Mother Name *</Label>
                      <Input id="father_mother_name" placeholder="Enter parent name" {...register('father_mother_name')} />
                      {errors.father_mother_name && <p className="text-xs text-destructive">{errors.father_mother_name.message}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="student_mobile">Student Mobile *</Label>
                      <Input id="student_mobile" placeholder="10-digit mobile" maxLength={10} {...register('student_mobile')} />
                      {errors.student_mobile && <p className="text-xs text-destructive">{errors.student_mobile.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_mobile">Parent Mobile *</Label>
                      <Input id="parent_mobile" placeholder="10-digit mobile" maxLength={10} {...register('parent_mobile')} />
                      {errors.parent_mobile && <p className="text-xs text-destructive">{errors.parent_mobile.message}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input id="email" type="email" placeholder="email@example.com" {...register('email')} />
                      {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth *</Label>
                      <Input id="dob" type="date" {...register('dob')} />
                      {errors.dob && <p className="text-xs text-destructive">{errors.dob.message}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender *</Label>
                      <Select value={selectedGender} onValueChange={(val) => setValue('gender', val as 'male' | 'female' | 'other')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Student Status *</Label>
                      <Select value={selectedStatus} onValueChange={(val) => setValue('status', val as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="dropped">Dropped</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Textarea id="address" placeholder="Enter full address" {...register('address')} />
                    {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Course & Batch */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Course & Batch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Course *</Label>
                      <Select value={selectedCourseId} onValueChange={(val) => setValue('course_id', val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.course_id && <p className="text-xs text-destructive">{errors.course_id.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Batch *</Label>
                      <Select
                        value={selectedBatchId}
                        onValueChange={(val) => setValue('batch_id', val)}
                        disabled={!selectedCourseId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={selectedCourseId ? 'Select batch' : 'Select course first'} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredBatches.map((batch) => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.batch_id && <p className="text-xs text-destructive">{errors.batch_id.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admission_date">Admission Date *</Label>
                    <Input id="admission_date" type="date" {...register('admission_date')} />
                    {errors.admission_date && <p className="text-xs text-destructive">{errors.admission_date.message}</p>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Fee Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fee Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="total_fee">Total Fee (₹) *</Label>
                      <Input id="total_fee" type="number" placeholder="0" {...register('total_fee')} />
                      {errors.total_fee && <p className="text-xs text-destructive">{errors.total_fee.message}</p>}
                    </div>
                    {!isEditing && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="initial_payment">Initial Payment (₹)</Label>
                          <Input id="initial_payment" type="number" placeholder="0" {...register('initial_payment')} />
                        </div>
                        <div className="space-y-2">
                          <Label>Payment Method</Label>
                          <Select
                            defaultValue="cash"
                            onValueChange={(val) => setValue('payment_method', val as StudentFormData['payment_method'])}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea placeholder="Any additional notes..." {...register('notes')} />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar - Photo */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Student Photo</CardTitle>
                </CardHeader>
                <CardContent>
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full aspect-square object-cover rounded-xl border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={removePhoto}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer bg-muted/30">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium text-muted-foreground">Upload Photo</span>
                      <span className="text-xs text-muted-foreground mt-1">JPG, PNG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                    </label>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <Separator />

            <div className="flex flex-col gap-3">
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    {isEditing ? 'Updating Student...' : 'Creating Admission...'}
                  </div>
                ) : (
                  isEditing ? 'Update Student' : 'Save Admission'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
