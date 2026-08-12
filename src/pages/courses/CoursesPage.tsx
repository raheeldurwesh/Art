import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { courseSchema, type CourseFormData } from '@/schemas'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, BookOpen, Clock, IndianRupee } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Course } from '@/types'
import { EmptyState } from '@/components/shared/EmptyState'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
  })

  useEffect(() => {
    fetchCourses()
  }, [])

  async function fetchCourses() {
    const { data } = await supabase.from('courses').select('*').order('name')
    setCourses((data as Course[]) || [])
    setLoading(false)
  }

  function openAddForm() {
    setEditingCourse(null)
    reset({ name: '', duration_months: 3, fee: 0, description: '', status: 'active' })
    setFormOpen(true)
  }

  function openEditForm(course: Course) {
    setEditingCourse(course)
    reset({
      name: course.name,
      duration_months: course.duration_months,
      fee: course.fee,
      description: course.description || '',
      status: course.status,
    })
    setFormOpen(true)
  }

  async function onSubmit(data: CourseFormData) {
    try {
      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update(data)
          .eq('id', editingCourse.id)
        if (error) throw error
        toast.success('Course updated successfully')
      } else {
        const { error } = await supabase.from('courses').insert(data)
        if (error) throw error
        toast.success('Course added successfully')
      }
      setFormOpen(false)
      fetchCourses()
    } catch (error) {
      console.error(error)
      toast.error('Failed to save course')
    }
  }

  async function handleDelete() {
    if (!deletingCourse) return
    try {
      const { error } = await supabase.from('courses').delete().eq('id', deletingCourse.id)
      if (error) throw error
      toast.success('Course deleted')
      setDeleteOpen(false)
      setDeletingCourse(null)
      fetchCourses()
    } catch {
      toast.error('Cannot delete course with enrolled students')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Manage your institute courses"
        actions={[{ label: 'Add Course', icon: Plus, onClick: openAddForm }]}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Add your first course to start enrolling students."
          actionLabel="Add Course"
          onAction={openAddForm}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="group hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-primary/10 p-2.5">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold font-heading">{course.name}</h3>
                        <StatusBadge status={course.status} className="mt-1" />
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(course)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { setDeletingCourse(course); setDeleteOpen(true) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {course.duration_months} months
                    </span>
                    <span className="flex items-center gap-1.5">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {formatCurrency(course.fee)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Edit Course' : 'Add New Course'}</DialogTitle>
            <DialogDescription>
              {editingCourse ? 'Update the course details.' : 'Fill in the details to add a new course.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Course Name *</Label>
              <Input id="name" placeholder="e.g., Web Development" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration_months">Duration (Months) *</Label>
                <Input id="duration_months" type="number" min={1} {...register('duration_months')} />
                {errors.duration_months && <p className="text-xs text-destructive">{errors.duration_months.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fee">Fee (₹) *</Label>
                <Input id="fee" type="number" min={0} {...register('fee')} />
                {errors.fee && <p className="text-xs text-destructive">{errors.fee.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Brief description..." {...register('description')} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select defaultValue={editingCourse?.status || 'active'} onValueChange={(val) => setValue('status', val as 'active' | 'inactive')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Add Course'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Course"
        description={`Are you sure you want to delete "${deletingCourse?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
