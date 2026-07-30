import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column, type Filter } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus, Edit, Trash2 } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Student, Course } from '@/types'

export default function StudentsListPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [{ data: studentsData }, { data: coursesData }] = await Promise.all([
        supabase
          .from('students')
          .select('*, course:courses(name), batch:batches(name)')
          .order('created_at', { ascending: false }),
        supabase.from('courses').select('*').eq('status', 'active'),
      ])
      setStudents((studentsData as Student[]) || [])
      setCourses((coursesData as Course[]) || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteStudent() {
    if (!studentToDelete) return
    setDeleting(true)

    try {
      await Promise.all([
        supabase.from('student_documents').delete().eq('student_id', studentToDelete.id),
        supabase.from('certificates').delete().eq('student_id', studentToDelete.id),
        supabase.from('attendance').delete().eq('student_id', studentToDelete.id),
        supabase.from('fee_payments').delete().eq('student_id', studentToDelete.id),
        supabase.from('fees').delete().eq('student_id', studentToDelete.id),
      ])

      const { error } = await supabase.from('students').delete().eq('id', studentToDelete.id)
      if (error) throw error

      toast.success(`Student ${studentToDelete.full_name} deleted successfully`)
      setStudents(students.filter((s) => s.id !== studentToDelete.id))
    } catch (err) {
      console.error('Delete student error:', err)
      toast.error('Failed to delete student')
    } finally {
      setDeleting(false)
      setStudentToDelete(null)
    }
  }

  const columns: Column<Student>[] = [
    {
      key: 'full_name',
      header: 'Student',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {row.photo_url && <AvatarImage src={row.photo_url} />}
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {getInitials(row.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{row.full_name}</p>
            <p className="text-xs text-muted-foreground">{row.admission_no}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'student_mobile',
      header: 'Mobile',
      cell: (row) => <span className="text-sm">{row.student_mobile}</span>,
    },
    {
      key: 'course_id',
      header: 'Course',
      cell: (row) => (
        <span className="text-sm">
          {(row.course as unknown as { name: string })?.name || '-'}
        </span>
      ),
    },
    {
      key: 'batch_id',
      header: 'Batch',
      cell: (row) => (
        <span className="text-sm">
          {(row.batch as unknown as { name: string })?.name || '-'}
        </span>
      ),
    },
    {
      key: 'admission_date',
      header: 'Admission Date',
      sortable: true,
      cell: (row) => <span className="text-sm">{formatDate(row.admission_date)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/students/${row.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => setStudentToDelete(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const filters: Filter[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
        { value: 'dropped', label: 'Dropped' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    {
      key: 'course_id',
      label: 'Course',
      options: courses.map((c) => ({ value: c.id, label: c.name })),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage all enrolled students"
        actions={[
          {
            label: 'New Admission',
            icon: UserPlus,
            onClick: () => navigate('/admissions/new'),
          },
        ]}
      />

      <DataTable
        data={students}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search by name, admission no, or mobile no..."
        searchKey={(row) => `${row.full_name} ${row.admission_no} ${row.student_mobile} ${row.parent_mobile}`}
        loading={loading}
        emptyTitle="No students yet"
        emptyDescription="Get started by adding your first student admission."
        onRowClick={(row) => navigate(`/students/${row.id}`)}
      />

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive text-lg">Delete Student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong className="text-foreground">{studentToDelete.full_name}</strong> ({studentToDelete.admission_no})?
                This action cannot be undone and will remove all associated fees, attendance, and certificates.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setStudentToDelete(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteStudent} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
