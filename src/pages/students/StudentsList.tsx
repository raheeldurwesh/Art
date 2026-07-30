import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column, type Filter } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserPlus } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Student, Course } from '@/types'

export default function StudentsListPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

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
    </div>
  )
}
