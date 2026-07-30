import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable, type Column, type Filter } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { CreditCard, TrendingUp, AlertTriangle, Phone } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Fee, Student } from '@/types'

interface FeeWithStudent extends Fee {
  status: string
  student: Pick<Student, 'id' | 'full_name' | 'admission_no' | 'student_mobile' | 'parent_mobile'>
}

export default function FeesPage() {
  const navigate = useNavigate()
  const [fees, setFees] = useState<FeeWithStudent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFees()
  }, [])

  function computeFeeStatus(remaining: number, total: number): string {
    if (remaining <= 0) return 'paid'
    if (remaining < total) return 'partial'
    return 'unpaid'
  }

  async function fetchFees() {
    const { data } = await supabase
      .from('fees')
      .select('*, student:students(id, full_name, admission_no, student_mobile, parent_mobile)')
      .order('created_at', { ascending: false })

    const processed = ((data as FeeWithStudent[]) || []).map((item) => ({
      ...item,
      status: computeFeeStatus(item.remaining, item.total_fee),
    }))

    setFees(processed)
    setLoading(false)
  }

  const totalCollected = fees.reduce((sum, f) => sum + f.paid, 0)
  const totalPending = fees.reduce((sum, f) => sum + f.remaining, 0)
  const totalFees = fees.reduce((sum, f) => sum + f.total_fee, 0)

  const filters: Filter[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'paid', label: 'Paid' },
        { value: 'partial', label: 'Partial' },
        { value: 'unpaid', label: 'Unpaid' },
      ],
    },
  ]

  const columns: Column<FeeWithStudent>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.student?.full_name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{row.student?.admission_no}</span>
            {(row.student?.student_mobile || row.student?.parent_mobile) && (
              <span className="flex items-center gap-1">
                • <Phone className="h-3 w-3 inline" /> {row.student?.student_mobile || row.student?.parent_mobile}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'total_fee',
      header: 'Total Fee',
      sortable: true,
      cell: (row) => <span className="font-medium">{formatCurrency(row.total_fee)}</span>,
    },
    {
      key: 'paid',
      header: 'Paid',
      cell: (row) => <span className="text-emerald-600 font-semibold">{formatCurrency(row.paid)}</span>,
    },
    {
      key: 'remaining',
      header: 'Remaining',
      sortable: true,
      cell: (row) => (
        <span className={row.remaining > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
          {formatCurrency(row.remaining)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-36 text-right',
      cell: (row) =>
        row.remaining > 0 ? (
          <Button
            size="sm"
            variant="outline"
            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/fees/pay/${row.student_id}`)
            }}
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            Record Pay
          </Button>
        ) : (
          <span className="text-xs text-emerald-600 font-medium px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950">
            Cleared
          </span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Fees" description="Track and manage student fee payments" />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Fees" value={formatCurrency(totalFees)} icon={CreditCard} index={0} />
        <StatCard title="Collected" value={formatCurrency(totalCollected)} icon={TrendingUp} index={1} />
        <StatCard title="Pending Dues" value={formatCurrency(totalPending)} icon={AlertTriangle} index={2} />
      </div>

      {/* Fee Table */}
      <DataTable
        data={fees}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search by student name, mobile no, or admission no..."
        searchKey={(row) =>
          `${row.student?.full_name || ''} ${row.student?.admission_no || ''} ${row.student?.student_mobile || ''} ${row.student?.parent_mobile || ''}`
        }
        loading={loading}
        emptyTitle="No fee records"
        emptyDescription="Fee records will appear here after student admissions."
        onRowClick={(row) => navigate(`/students/${row.student_id}`)}
      />
    </div>
  )
}
