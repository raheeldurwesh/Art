import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { feePaymentSchema, type FeePaymentFormData } from '@/schemas'
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
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import type { Student, Fee } from '@/types'

export default function RecordPaymentPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const [fee, setFee] = useState<Fee | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FeePaymentFormData>({
    resolver: zodResolver(feePaymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
    },
  })

  useEffect(() => {
    if (studentId) fetchData()
  }, [studentId])

  async function fetchData() {
    const [{ data: studentData }, { data: feeData }] = await Promise.all([
      supabase.from('students').select('*, course:courses(name)').eq('id', studentId!).single(),
      supabase.from('fees').select('*').eq('student_id', studentId!).single(),
    ])
    setStudent(studentData as Student)
    setFee(feeData as Fee)
    setLoading(false)
  }

  async function onSubmit(data: FeePaymentFormData) {
    if (!fee || !student) return
    if (data.amount > fee.remaining) {
      toast.error('Amount cannot exceed remaining balance')
      return
    }

    try {
      // Record payment
      const { error: paymentError } = await supabase.from('fee_payments').insert({
        fee_id: fee.id,
        student_id: student.id,
        amount: data.amount,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        notes: data.notes || null,
      })
      if (paymentError) throw paymentError

      // Update fee record
      const { error: feeError } = await supabase
        .from('fees')
        .update({
          paid: fee.paid + data.amount,
          remaining: fee.remaining - data.amount,
        })
        .eq('id', fee.id)
      if (feeError) throw feeError

      toast.success(`Payment of ${formatCurrency(data.amount)} recorded successfully!`)
      navigate(`/students/${studentId}`)
    } catch {
      toast.error('Failed to record payment')
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (!student || !fee) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Record Payment" description={`Payment for ${student.full_name}`} />

      {/* Fee Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Fee</p>
            <p className="text-lg font-bold">{formatCurrency(fee.total_fee)}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(fee.paid)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 border-red-100 dark:bg-red-950/30 dark:border-red-900">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-400">{formatCurrency(fee.remaining)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input id="amount" type="number" min={1} max={fee.remaining} placeholder="0" {...register('amount')} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input id="payment_date" type="date" {...register('payment_date')} />
                {errors.payment_date && <p className="text-xs text-destructive">{errors.payment_date.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select defaultValue="cash" onValueChange={(val) => setValue('payment_method', val as FeePaymentFormData['payment_method'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Payment notes..." {...register('notes')} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
