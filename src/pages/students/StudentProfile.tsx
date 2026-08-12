import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ProfileSkeleton } from '@/components/shared/LoadingSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit,
  MessageCircle,
  CreditCard,
  CalendarCheck,
  Award,
  FileText,
  Upload,
  Trash2,
  FolderOpen,
} from 'lucide-react'
import { formatDate, formatCurrency, getInitials, generateWhatsAppUrl, calculateDynamicFee } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import type { Student, Fee, FeePayment, Attendance, Certificate, StudentDocument } from '@/types'
import { pdf } from '@react-pdf/renderer'
import { CertificatePDFDocument } from '@/lib/pdf/CertificatePDF'

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { instituteName, settings } = useSettings()
  const [student, setStudent] = useState<Student | null>(null)
  const [fee, setFee] = useState<Fee | null>(null)
  const [payments, setPayments] = useState<FeePayment[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [generatingCert, setGeneratingCert] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) fetchStudentData()
  }, [id])

  async function fetchStudentData() {
    try {
      const [
        { data: studentData },
        { data: feeData },
        { data: paymentsData },
        { data: attendanceData },
        { data: certsData },
        { data: docsData },
      ] = await Promise.all([
        supabase.from('students').select('*, course:courses(*), batch:batches(*)').eq('id', id!).single(),
        supabase.from('fees').select('*').eq('student_id', id!).single(),
        supabase.from('fee_payments').select('*').eq('student_id', id!).order('payment_date', { ascending: false }),
        supabase.from('attendance').select('*').eq('student_id', id!).order('date', { ascending: false }).limit(30),
        supabase.from('certificates').select('*, course:courses(name)').eq('student_id', id!),
        supabase.from('student_documents').select('*').eq('student_id', id!).order('uploaded_at', { ascending: false }),
      ])

      setStudent(studentData as Student)
      setFee(feeData as Fee)
      setPayments((paymentsData as FeePayment[]) || [])
      setAttendance((attendanceData as Attendance[]) || [])
      setCertificates((certsData as Certificate[]) || [])
      setDocuments((docsData as StudentDocument[]) || [])
    } catch (error) {
      console.error('Error fetching student:', error)
      toast.error('Student not found')
      navigate('/students')
    } finally {
      setLoading(false)
    }
  }

  async function removeStudentPhoto() {
    if (!student) return
    try {
      const { error } = await supabase.from('students').update({ photo_url: null }).eq('id', student.id)
      if (error) throw error
      setStudent({ ...student, photo_url: null })
      toast.success('Student photo removed')
    } catch {
      toast.error('Failed to remove photo')
    }
  }

  async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !student) return

    setUploadingDoc(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${student.id}_${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      const { error: dbError } = await supabase.from('student_documents').insert({
        student_id: student.id,
        name: file.name,
        file_url: urlData.publicUrl,
      })

      if (dbError) throw dbError

      toast.success('Document uploaded successfully!')
      fetchStudentData()
    } catch (err) {
      console.error('Document upload error:', err)
      toast.error('Failed to upload document')
    } finally {
      setUploadingDoc(false)
    }
  }

  async function deleteDocument(docId: string) {
    try {
      const { error } = await supabase.from('student_documents').delete().eq('id', docId)
      if (error) throw error
      toast.success('Document deleted successfully')
      setDocuments(documents.filter((d) => d.id !== docId))
    } catch {
      toast.error('Failed to delete document')
    }
  }

  function openWhatsApp(type: 'admission' | 'fee_reminder' | 'custom') {
    if (!student) return
    let message = ''

    switch (type) {
      case 'admission':
        message = `Dear ${student.full_name},\n\nYour admission has been confirmed at ${instituteName}.\n\nAdmission No: ${student.admission_no}\nCourse: ${(student.course as unknown as { name: string })?.name || ''}\nAdmission Date: ${formatDate(student.admission_date)}\n\nThank you!`
        break
      case 'fee_reminder':
        message = `Dear ${student.full_name},\n\nThis is a reminder for your pending fee payment at ${instituteName}.\n\nTotal Stay: ${monthsStayed} Month(s)\nTotal Fee Due: ${formatCurrency(displayTotalFee)}\nPaid: ${formatCurrency(fee?.paid || 0)}\nRemaining Balance: ${formatCurrency(displayRemaining)}\n\nPlease clear your dues at the earliest.\n\nThank you!`
        break
      case 'custom':
        message = `Dear ${student.full_name},\n\n`
        break
    }

    window.open(generateWhatsAppUrl(student.student_mobile, message), '_blank')
  }

  async function generateCertificateForStudent() {
    if (!student) return
    setGeneratingCert(true)
    try {
      const { error } = await supabase.from('certificates').insert({
        student_id: student.id,
        course_id: student.course_id,
        issue_date: new Date().toISOString().split('T')[0],
      })
      if (error) throw error
      toast.success('Certificate generated successfully!')
      fetchStudentData()
    } catch {
      toast.error('Failed to generate certificate')
    } finally {
      setGeneratingCert(false)
    }
  }

  async function downloadCertPDF(cert: Certificate) {
    try {
      const studentName = student?.full_name || 'Student'
      const courseName = (student?.course as unknown as { name: string })?.name || 'Course'
      const duration = (student?.course as unknown as { duration_months: number })?.duration_months || 3

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

  async function deleteStudent() {
    if (!student) return
    setDeleting(true)
    try {
      await Promise.all([
        supabase.from('student_documents').delete().eq('student_id', student.id),
        supabase.from('certificates').delete().eq('student_id', student.id),
        supabase.from('attendance').delete().eq('student_id', student.id),
        supabase.from('fee_payments').delete().eq('student_id', student.id),
        supabase.from('fees').delete().eq('student_id', student.id),
      ])

      const { error } = await supabase.from('students').delete().eq('id', student.id)
      if (error) throw error

      toast.success(`Student ${student.full_name} deleted successfully`)
      navigate('/students')
    } catch (err) {
      console.error('Delete student error:', err)
      toast.error('Failed to delete student')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Student Profile" />
        <ProfileSkeleton />
      </div>
    )
  }

  if (!student) return null

  const courseName = (student.course as unknown as { name: string })?.name || '-'
  const batchName = (student.batch as unknown as { name: string })?.name || '-'
  const presentCount = attendance.filter((a) => a.status === 'present').length
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0

  const dynamicFee = student?.admission_date && fee
    ? calculateDynamicFee(fee.total_fee, student.admission_date, fee.paid, student.status, student.updated_at)
    : null

  const displayTotalFee = dynamicFee ? dynamicFee.totalFee : (fee?.total_fee || 0)
  const displayRemaining = dynamicFee ? dynamicFee.remaining : (fee?.remaining || 0)
  const monthsStayed = dynamicFee ? dynamicFee.monthsEnrolled : 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Profile"
        actions={[
          { label: 'Edit', icon: Edit, onClick: () => navigate(`/students/${id}/edit`), variant: 'outline' },
          { label: 'Delete', icon: Trash2, onClick: () => setDeleteDialogOpen(true), variant: 'destructive' },
        ]}
      />

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive text-lg">Delete Student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong className="text-foreground">{student.full_name}</strong> ({student.admission_no})?
                This action cannot be undone and will remove all associated fee records, attendance, and certificates.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={deleteStudent} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-24 w-24 rounded-xl">
                  {student.photo_url && <AvatarImage src={student.photo_url} />}
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl font-bold">
                    {getInitials(student.full_name)}
                  </AvatarFallback>
                </Avatar>
                {student.photo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10 h-6 px-2"
                    onClick={removeStudentPhoto}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove Photo
                  </Button>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h2 className="text-xl font-bold font-heading">{student.full_name}</h2>
                  <StatusBadge status={student.status} />
                </div>
                <p className="text-sm text-muted-foreground font-mono">{student.admission_no}</p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {student.student_mobile}
                  </span>
                  {student.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> {student.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Admitted {formatDate(student.admission_date)} ({monthsStayed} mo)
                  </span>
                </div>
              </div>

              {/* WhatsApp buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950"
                  onClick={() => openWhatsApp('admission')}
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  Admission Msg
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950"
                  onClick={() => openWhatsApp('fee_reminder')}
                >
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  Fee Reminder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openWhatsApp('custom')}
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  Custom Msg
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Full Name" value={student.full_name} />
                <InfoRow label="Father/Mother" value={student.father_mother_name} />
                {student.dob && student.dob !== '2000-01-01' && <InfoRow label="Date of Birth" value={formatDate(student.dob)} />}
                <InfoRow label="Gender" value={student.gender.charAt(0).toUpperCase() + student.gender.slice(1)} />
                <InfoRow label="Student Mobile" value={student.student_mobile} />
                <InfoRow label="Parent Mobile" value={student.parent_mobile} />
                {student.email && <InfoRow label="Email" value={student.email} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Course & Enrollment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Course" value={courseName} />
                <InfoRow label="Batch" value={batchName} />
                <InfoRow label="Admission Date" value={formatDate(student.admission_date)} />
                <InfoRow label="Duration Enrolled" value={`${monthsStayed} Month(s)`} />
                <InfoRow label="Status" value={<StatusBadge status={student.status} />} />
                <Separator />
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{student.address}</span>
                </div>
                {student.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{student.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees">
          <div className="space-y-6">
            {/* Fee Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-4">
              <Card className="bg-purple-50/50 border-purple-100 dark:bg-purple-950/30 dark:border-purple-900">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Duration Enrolled</p>
                  <p className="text-xl font-bold font-heading text-purple-700 dark:text-purple-400">{monthsStayed} {monthsStayed === 1 ? 'Month' : 'Months'}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total Fee Due</p>
                  <p className="text-xl font-bold font-heading">{formatCurrency(displayTotalFee)}</p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-xl font-bold font-heading text-emerald-700 dark:text-emerald-400">{formatCurrency(fee?.paid || 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50/50 border-red-100 dark:bg-red-950/30 dark:border-red-900">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Remaining Dues</p>
                  <p className="text-xl font-bold font-heading text-red-700 dark:text-red-400">{formatCurrency(displayRemaining)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Payment History */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Payment History</CardTitle>
                <Button size="sm" onClick={() => navigate(`/fees/pay/${id}`)}>
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  Record Payment
                </Button>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No payments recorded yet</p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">{payment.receipt_no || 'Payment'}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(payment.payment_date)} · {payment.payment_method.replace('_', ' ')}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-emerald-600">
                          +{formatCurrency(payment.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total Days</p>
                  <p className="text-xl font-bold font-heading">{attendance.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Present</p>
                  <p className="text-xl font-bold font-heading text-emerald-700 dark:text-emerald-400">{presentCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Attendance Rate</p>
                  <p className="text-xl font-bold font-heading">{attendanceRate}%</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No attendance records yet</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm">{formatDate(a.date)}</span>
                        <StatusBadge status={a.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Certificates</CardTitle>
              <Button size="sm" onClick={generateCertificateForStudent} disabled={generatingCert}>
                <Award className="h-4 w-4 mr-1.5" />
                {generatingCert ? 'Generating...' : 'Generate Certificate'}
              </Button>
            </CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No certificates generated yet. Click above to generate one.
                </p>
              ) : (
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950">
                          <Award className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{cert.certificate_no}</p>
                          <p className="text-xs text-muted-foreground">
                            {(cert.course as unknown as { name: string })?.name} · {formatDate(cert.issue_date)}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => downloadCertPDF(cert)}>
                        <FileText className="h-4 w-4 mr-1.5" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Student Documents & Uploaded Files</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Attach ID proofs, marksheets, certificates, or student documents</p>
              </div>
              <label>
                <Button size="sm" asChild disabled={uploadingDoc}>
                  <span>
                    <Upload className="h-4 w-4 mr-1.5" />
                    {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                  </span>
                </Button>
                <input type="file" className="hidden" onChange={handleDocumentUpload} />
              </label>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FolderOpen className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No uploaded documents yet</p>
                  <p className="text-xs mt-1">Click "Upload Document" above to attach student files.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950 shrink-0">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate block">
                            {doc.name}
                          </a>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {formatDate(doc.uploaded_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => deleteDocument(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
