import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
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
import { Label } from '@/components/ui/label'
import { Award, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'
import { toast } from 'sonner'
import type { Certificate, Student } from '@/types'
import { pdf } from '@react-pdf/renderer'
import { CertificatePDFDocument } from '@/lib/pdf/CertificatePDF'

export default function CertificatesPage() {
  const { instituteName, settings } = useSettings()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [completedStudents, setCompletedStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [{ data: certsData }, { data: studentsData }] = await Promise.all([
      supabase
        .from('certificates')
        .select('*, student:students(full_name, admission_no, student_mobile), course:courses(name, duration_months)')
        .order('created_at', { ascending: false }),
      supabase
        .from('students')
        .select('*, course:courses(name)')
        .order('full_name', { ascending: true }),
    ])
    setCertificates((certsData as Certificate[]) || [])
    setCompletedStudents((studentsData as Student[]) || [])
    setLoading(false)
  }

  async function generateCertificate() {
    if (!selectedStudent) return
    setGenerating(true)

    try {
      const student = completedStudents.find((s) => s.id === selectedStudent)
      if (!student) throw new Error('Student not found')

      const { error } = await supabase.from('certificates').insert({
        student_id: student.id,
        course_id: student.course_id,
        issue_date: new Date().toISOString().split('T')[0],
      })

      if (error) throw error

      toast.success('Certificate generated successfully!')
      setGenerateOpen(false)
      setSelectedStudent('')
      fetchData()
    } catch {
      toast.error('Failed to generate certificate')
    } finally {
      setGenerating(false)
    }
  }

  async function downloadPDF(cert: Certificate) {
    try {
      const studentName = (cert.student as unknown as { full_name: string })?.full_name || 'Student'
      const courseName = (cert.course as unknown as { name: string })?.name || 'Course'
      const duration = (cert.course as unknown as { duration_months: number })?.duration_months || 3

      const doc = (
        <CertificatePDFDocument
          certificateNo={cert.certificate_no}
          studentName={studentName}
          courseName={courseName}
          durationMonths={duration}
          issueDate={formatDate(cert.issue_date)}
          instituteName={instituteName}
          directorName={settings?.director_name || 'Director'}
          directorSignatureUrl={settings?.director_signature_url}
        />
      )

      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Certificate_${cert.certificate_no}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Certificate downloaded')
    } catch (error) {
      console.error(error)
      toast.error('Failed to download PDF')
    }
  }

  const columns: Column<Certificate>[] = [
    {
      key: 'certificate_no',
      header: 'Certificate No',
      cell: (row) => <span className="font-mono text-sm font-medium">{row.certificate_no}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium">
            {(row.student as unknown as { full_name: string })?.full_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {(row.student as unknown as { admission_no: string })?.admission_no}
          </p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      cell: (row) => (row.course as unknown as { name: string })?.name || '-',
    },
    {
      key: 'issue_date',
      header: 'Issue Date',
      cell: (row) => formatDate(row.issue_date),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-28',
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); downloadPDF(row) }}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Download
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificates"
        description="Generate and manage course completion certificates"
        actions={[
          {
            label: 'Generate Certificate',
            icon: Award,
            onClick: () => setGenerateOpen(true),
          },
        ]}
      />

      <DataTable
        data={certificates}
        columns={columns}
        searchPlaceholder="Search by certificate no, student name, or mobile no..."
        searchKey={(row) =>
          `${row.certificate_no} ${(row.student as unknown as { full_name: string })?.full_name || ''} ${(row.student as unknown as { student_mobile: string })?.student_mobile || ''}`
        }
        loading={loading}
        emptyTitle="No certificates yet"
        emptyDescription="Generate certificates for students who have completed their courses."
      />

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Certificate</DialogTitle>
            <DialogDescription>
              Select a student to generate a course completion certificate at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {completedStudents.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No students found
                    </div>
                  ) : (
                    completedStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} — {(s.course as unknown as { name: string })?.name} ({s.status})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={generateCertificate} disabled={!selectedStudent || generating}>
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
