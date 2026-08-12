import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { feePaymentSchema, type FeePaymentFormData } from '@/schemas'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/contexts/SettingsContext'
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
import { QrCode, Copy, Check, ExternalLink, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import type { Student, Fee } from '@/types'

export default function RecordPaymentPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const { upiId, instituteName } = useSettings()
  const [student, setStudent] = useState<Student | null>(null)
  const [fee, setFee] = useState<Fee | null>(null)
  const [loading, setLoading] = useState(true)
  const [showQrCode, setShowQrCode] = useState(false)
  const [copied, setCopied] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FeePaymentFormData>({
    resolver: zodResolver(feePaymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
    },
  })

  const currentAmount = watch('amount') || 0
  const currentMethod = watch('payment_method')

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

  function copyUpiId() {
    if (!upiId) return
    navigator.clipboard.writeText(upiId)
    setCopied(true)
    toast.success('UPI ID copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
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

  // Dynamic UPI URI
  const encodedUpiId = encodeURIComponent(upiId)
  const encodedName = encodeURIComponent(instituteName)
  const encodedNote = encodeURIComponent(`Fee payment for ${student.full_name}`)
  const upiUri = `upi://pay?pa=${encodedUpiId}&pn=${encodedName}&am=${currentAmount}&cu=INR&tn=${encodedNote}`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`

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
        <CardContent className="space-y-4">
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
              <div className="flex items-center justify-between gap-1">
                <Label className="whitespace-nowrap">Payment Method *</Label>
                {currentMethod === 'upi' && (
                  <button
                    type="button"
                    onClick={() => setShowQrCode(!showQrCode)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium px-1 py-0.5 rounded transition-colors"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>{showQrCode ? 'Hide QR' : 'Show QR'}</span>
                  </button>
                )}
              </div>
              <Select
                defaultValue="cash"
                onValueChange={(val) => {
                  const method = val as FeePaymentFormData['payment_method']
                  setValue('payment_method', method)
                  if (method === 'upi') {
                    setShowQrCode(true)
                  } else {
                    setShowQrCode(false)
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI (Instant QR Code)</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic UPI QR Code Card */}
            <AnimatePresence>
              {showQrCode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-primary font-semibold text-sm">
                      <Sparkles className="h-4 w-4" />
                      <span>Instant UPI Payment QR Code</span>
                    </div>

                    {!upiId ? (
                      <div className="py-4 space-y-2">
                        <p className="text-xs text-muted-foreground">No UPI ID configured in Admin Settings.</p>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/settings">Set Institute UPI ID in Settings →</Link>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-center">
                          <div className="p-4 bg-white rounded-2xl shadow-md border border-gray-200 inline-flex flex-col items-center">
                            <img
                              src={qrImageUrl}
                              alt="UPI Payment QR Code"
                              className="h-48 w-48 object-contain rounded-md"
                            />
                            <p className="text-[11px] font-medium text-gray-600 mt-2.5 tracking-tight">
                              Scan with GPay, PhonePe, Paytm or any UPI App
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 text-xs pt-1">
                          <span className="text-muted-foreground font-medium">UPI ID:</span>
                          <span className="font-semibold font-mono bg-background px-2.5 py-1 rounded-md border shadow-xs">
                            {upiId}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={copyUpiId}
                          >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                            {copied ? 'Copied' : 'Copy'}
                          </Button>
                        </div>

                        {currentAmount > 0 && (
                          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-3.5 py-1 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                            <span>Paying Amount: {formatCurrency(Number(currentAmount))}</span>
                          </div>
                        )}

                        <div className="pt-1">
                          <Button variant="outline" size="sm" asChild className="text-xs h-8">
                            <a href={upiUri} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              Open UPI App Directly (Mobile)
                            </a>
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Payment notes..." {...register('notes')} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
