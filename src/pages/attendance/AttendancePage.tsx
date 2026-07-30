import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, X, Save, CalendarCheck, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Course, Batch, Student, AttendanceStatus } from '@/types'

interface AttendanceRecord {
  student_id: string
  status: AttendanceStatus
}

export default function AttendancePage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]!)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [existingAttendance, setExistingAttendance] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      setFilteredBatches(batches.filter((b) => b.course_id === selectedCourse))
      setSelectedBatch('')
      setStudents([])
    }
  }, [selectedCourse, batches])

  useEffect(() => {
    if (selectedBatch && selectedDate) {
      fetchStudentsAndAttendance()
    }
  }, [selectedBatch, selectedDate])

  async function fetchInitialData() {
    const [{ data: coursesData }, { data: batchesData }] = await Promise.all([
      supabase.from('courses').select('*').eq('status', 'active').order('name'),
      supabase.from('batches').select('*').eq('status', 'active').order('name'),
    ])
    setCourses((coursesData as Course[]) || [])
    setBatches((batchesData as Batch[]) || [])
  }

  async function fetchStudentsAndAttendance() {
    const [{ data: studentsData }, { data: attendanceData }] = await Promise.all([
      supabase
        .from('students')
        .select('*')
        .eq('batch_id', selectedBatch)
        .eq('status', 'active')
        .order('full_name'),
      supabase
        .from('attendance')
        .select('*')
        .eq('batch_id', selectedBatch)
        .eq('date', selectedDate),
    ])

    const studentsList = (studentsData as Student[]) || []
    setStudents(studentsList)

    if (attendanceData && attendanceData.length > 0) {
      setExistingAttendance(true)
      setRecords(
        attendanceData.map((a) => ({
          student_id: a.student_id as string,
          status: a.status as AttendanceStatus,
        }))
      )
    } else {
      setExistingAttendance(false)
      setRecords(
        studentsList.map((s) => ({
          student_id: s.id,
          status: 'present' as AttendanceStatus,
        }))
      )
    }
  }

  function toggleStatus(studentId: string) {
    setRecords((prev) =>
      prev.map((r) =>
        r.student_id === studentId
          ? { ...r, status: r.status === 'present' ? 'absent' : 'present' }
          : r
      )
    )
  }

  function markAllPresent() {
    setRecords((prev) => prev.map((r) => ({ ...r, status: 'present' })))
  }

  function markAllAbsent() {
    setRecords((prev) => prev.map((r) => ({ ...r, status: 'absent' })))
  }

  async function saveAttendance() {
    if (!selectedBatch || !selectedDate) return
    setSaving(true)

    try {
      if (existingAttendance) {
        await supabase
          .from('attendance')
          .delete()
          .eq('batch_id', selectedBatch)
          .eq('date', selectedDate)
      }

      const { error } = await supabase.from('attendance').insert(
        records.map((r) => ({
          student_id: r.student_id,
          batch_id: selectedBatch,
          date: selectedDate,
          status: r.status,
        }))
      )

      if (error) throw error
      toast.success('Attendance saved successfully!')
      setExistingAttendance(true)
    } catch {
      toast.error('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const presentCount = records.filter((r) => r.status === 'present').length
  const absentCount = records.filter((r) => r.status === 'absent').length

  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.admission_no.toLowerCase().includes(q) ||
      (s.student_mobile && s.student_mobile.includes(q)) ||
      (s.parent_mobile && s.parent_mobile.includes(q))
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Mark and manage student attendance" />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batch</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch} disabled={!selectedCourse}>
                <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>
                  {filteredBatches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance List */}
      {students.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">
                  {formatDate(selectedDate)} — {students.length} Students
                </CardTitle>
                <div className="flex gap-3 mt-2 text-sm">
                  <span className="text-emerald-600 font-medium">Present: {presentCount}</span>
                  <span className="text-red-600 font-medium">Absent: {absentCount}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={markAllPresent}>All Present</Button>
                <Button variant="outline" size="sm" onClick={markAllAbsent}>All Absent</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredStudents.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No matching students found for "{searchQuery}"
                  </p>
                ) : (
                  filteredStudents.map((student, i) => {
                    const record = records.find((r) => r.student_id === student.id)
                    const isPresent = record?.status === 'present'

                    return (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.02 }}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                            {student.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.admission_no} · Mobile: {student.student_mobile || student.parent_mobile}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={isPresent ? 'default' : 'outline'}
                            size="sm"
                            className={isPresent ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                            onClick={() => toggleStatus(student.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Present
                          </Button>
                          <Button
                            variant={!isPresent ? 'default' : 'outline'}
                            size="sm"
                            className={!isPresent ? 'bg-red-600 hover:bg-red-700' : ''}
                            onClick={() => toggleStatus(student.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Absent
                          </Button>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={saveAttendance} disabled={saving}>
                  <Save className="h-4 w-4 mr-1.5" />
                  {saving ? 'Saving...' : existingAttendance ? 'Update Attendance' : 'Save Attendance'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {selectedBatch && students.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No active students in this batch.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
