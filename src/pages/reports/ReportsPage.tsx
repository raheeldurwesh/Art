import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Users, CreditCard, CalendarCheck, Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'
import { pdf } from '@react-pdf/renderer'
import { ReportPDFDocument } from '@/lib/pdf/ReportPDF'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export default function ReportsPage() {
  const { instituteName } = useSettings()
  const [exporting, setExporting] = useState(false)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]!
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]!)
  const [admissionsData, setAdmissionsData] = useState<{ date: string; count: number }[]>([])
  const [feesData, setFeesData] = useState<{ total: number; paid: number; pending: number }>({ total: 0, paid: 0, pending: 0 })
  const [attendanceData, setAttendanceData] = useState<{ present: number; absent: number; total: number }>({ present: 0, absent: 0, total: 0 })

  useEffect(() => {
    fetchReportData()
  }, [dateFrom, dateTo])

  async function fetchReportData() {
    const [
      { data: students },
      { data: fees },
      { data: attendance },
    ] = await Promise.all([
      supabase
        .from('students')
        .select('admission_date')
        .gte('admission_date', dateFrom)
        .lte('admission_date', dateTo),
      supabase.from('fees').select('total_fee, paid, remaining'),
      supabase
        .from('attendance')
        .select('status')
        .gte('date', dateFrom)
        .lte('date', dateTo),
    ])

    // Admissions by date
    const admissionMap = new Map<string, number>()
    students?.forEach((s) => {
      const date = s.admission_date as string
      admissionMap.set(date, (admissionMap.get(date) || 0) + 1)
    })
    setAdmissionsData(
      Array.from(admissionMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    )

    // Fees
    const totalFee = fees?.reduce((sum, f) => sum + ((f.total_fee as number) || 0), 0) || 0
    const paidFee = fees?.reduce((sum, f) => sum + ((f.paid as number) || 0), 0) || 0
    setFeesData({ total: totalFee, paid: paidFee, pending: totalFee - paidFee })

    // Attendance
    const presentCount = attendance?.filter((a) => a.status === 'present').length || 0
    const totalCount = attendance?.length || 0
    setAttendanceData({ present: presentCount, absent: totalCount - presentCount, total: totalCount })
  }

  async function exportPDF() {
    setExporting(true)
    try {
      const totalAdmissions = admissionsData.reduce((sum, d) => sum + d.count, 0)
      const collectionRate = feesData.total > 0 ? Math.round((feesData.paid / feesData.total) * 100) : 0
      const attendanceRate = attendanceData.total > 0 ? Math.round((attendanceData.present / attendanceData.total) * 100) : 0

      const doc = (
        <ReportPDFDocument
          instituteName={instituteName}
          dateFrom={formatDate(dateFrom)}
          dateTo={formatDate(dateTo)}
          totalAdmissions={totalAdmissions}
          totalFees={feesData.total}
          paidFees={feesData.paid}
          pendingFees={feesData.pending}
          collectionRate={collectionRate}
          totalAttendance={attendanceData.total}
          presentCount={attendanceData.present}
          attendanceRate={attendanceRate}
        />
      )

      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Institute_Report_${dateFrom}_to_${dateTo}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Report PDF exported successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="View and export institute reports" />

      {/* Date Range */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 sm:flex sm:flex-wrap sm:items-end">
            <div className="space-y-2 flex-1 min-w-[140px]">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1 min-w-[140px]">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={exportPDF} disabled={exporting} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-1.5" />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="admissions" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 max-w-full flex-wrap sm:flex-nowrap">
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="admissions">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                title="Total Admissions"
                value={admissionsData.reduce((sum, d) => sum + d.count, 0)}
                icon={Users}
                index={0}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admissions Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {admissionsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={admissionsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        stroke="var(--color-muted-foreground)"
                        tickFormatter={(v) => formatDate(v)}
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelFormatter={(v) => formatDate(v)}
                      />
                      <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">No admissions in this period</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="fees">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard title="Total Fees" value={formatCurrency(feesData.total)} icon={CreditCard} index={0} />
              <StatCard title="Collected" value={formatCurrency(feesData.paid)} icon={CreditCard} index={1} />
              <StatCard title="Pending" value={formatCurrency(feesData.pending)} icon={CreditCard} index={2} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fee Collection Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Collection Rate</span>
                      <span className="font-medium">
                        {feesData.total > 0 ? Math.round((feesData.paid / feesData.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{
                          width: `${feesData.total > 0 ? (feesData.paid / feesData.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="attendance">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard title="Total Records" value={attendanceData.total} icon={CalendarCheck} index={0} />
              <StatCard title="Present" value={attendanceData.present} icon={CalendarCheck} index={1} />
              <StatCard title="Attendance Rate" value={`${attendanceData.total > 0 ? Math.round((attendanceData.present / attendanceData.total) * 100) : 0}%`} icon={CalendarCheck} index={2} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attendance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Overall Attendance Rate</span>
                      <span className="font-medium">
                        {attendanceData.total > 0 ? Math.round((attendanceData.present / attendanceData.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${attendanceData.total > 0 ? (attendanceData.present / attendanceData.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
