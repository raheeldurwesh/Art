import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatCardsSkeleton, TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  UserPlus,
  CreditCard,
  BookOpen,
  UserCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { DashboardStats, Student, FeePayment } from '@/types'

// Demo data for charts
const admissionsChartData = [
  { label: 'Jan', value: 12 },
  { label: 'Feb', value: 19 },
  { label: 'Mar', value: 15 },
  { label: 'Apr', value: 22 },
  { label: 'May', value: 18 },
  { label: 'Jun', value: 25 },
  { label: 'Jul', value: 30 },
]

const revenueChartData = [
  { label: 'Jan', value: 45000 },
  { label: 'Feb', value: 62000 },
  { label: 'Mar', value: 55000 },
  { label: 'Apr', value: 78000 },
  { label: 'May', value: 68000 },
  { label: 'Jun', value: 85000 },
  { label: 'Jul', value: 92000 },
]

const attendanceChartData = [
  { label: 'Mon', value: 92 },
  { label: 'Tue', value: 88 },
  { label: 'Wed', value: 95 },
  { label: 'Thu', value: 90 },
  { label: 'Fri', value: 85 },
  { label: 'Sat', value: 78 },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    todayAdmissions: 0,
    pendingFees: 0,
    totalCourses: 0,
    activeStudents: 0,
  })
  const [recentStudents, setRecentStudents] = useState<Student[]>([])
  const [recentPayments, setRecentPayments] = useState<FeePayment[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Fetch stats in parallel
      const [
        { count: totalStudents },
        { count: todayAdmissions },
        { count: totalCourses },
        { count: activeStudents },
        { data: students },
        { data: payments },
        { data: feesData },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('admission_date', today),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('students').select('*, course:courses(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('fee_payments').select('*, student:students(full_name, admission_no)').order('created_at', { ascending: false }).limit(5),
        supabase.from('fees').select('remaining'),
      ])

      const pendingFees = feesData?.reduce((sum, f) => sum + (f.remaining || 0), 0) || 0

      setStats({
        totalStudents: totalStudents || 0,
        todayAdmissions: todayAdmissions || 0,
        pendingFees,
        totalCourses: totalCourses || 0,
        activeStudents: activeStudents || 0,
      })

      setRecentStudents((students as Student[]) || [])
      setRecentPayments((payments as FeePayment[]) || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's your overview.</p>
        </div>
        <StatCardsSkeleton count={5} />
        <div className="grid gap-6 lg:grid-cols-2">
          <TableSkeleton rows={5} columns={3} />
          <TableSkeleton rows={5} columns={3} />
        </div>
      </div>
    )
  }

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users, trend: { value: 12, label: 'vs last month' } },
    { title: "Today's Admissions", value: stats.todayAdmissions, icon: UserPlus },
    { title: 'Pending Fees', value: formatCurrency(stats.pendingFees), icon: CreditCard },
    { title: 'Courses', value: stats.totalCourses, icon: BookOpen },
    { title: 'Active Students', value: stats.activeStudents, icon: UserCheck },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold font-heading tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's your overview.</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat, i) => (
          <StatCard key={stat.title} {...stat} index={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Admissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={admissionsChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Attendance %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={attendanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" domain={[70, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Attendance']}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Admissions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Recent Admissions</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/students')}>
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentStudents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No admissions yet</p>
              ) : (
                <div className="space-y-3">
                  {recentStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                          {student.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.admission_no}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={student.status} />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(student.admission_date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Payments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.9 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Recent Payments</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/fees')}>
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No payments yet</p>
              ) : (
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {(payment.student as unknown as { full_name: string })?.full_name || 'Student'}
                        </p>
                        <p className="text-xs text-muted-foreground">{payment.receipt_no}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600">
                          +{formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.payment_date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
