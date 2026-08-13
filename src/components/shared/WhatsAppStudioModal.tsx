import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageCircle, Users, ExternalLink, Send, Sparkles, X, Copy, Check, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Batch, Student } from '@/types'
import { supabase } from '@/lib/supabase'

interface WhatsAppStudioModalProps {
  isOpen: boolean
  onClose: () => void
  initialBatchId?: string
}

const TEMPLATES = [
  {
    id: 'holiday',
    title: '📢 Class Cancellation / Holiday Notice',
    text: (batchName: string) =>
      `📢 *ANNOUNCEMENT - ${batchName}*\n\nDear Students,\nPlease note that classes for *${batchName}* will remain closed on [Insert Date/Reason].\n\nRegular classes will resume from [Insert Resume Date].\n\n- Institute Management`,
  },
  {
    id: 'timing',
    title: '⏰ Batch Timing / Schedule Change',
    text: (batchName: string) =>
      `⏰ *SCHEDULE UPDATE - ${batchName}*\n\nDear Students,\nTomorrow's class timing for *${batchName}* has been updated to [Insert New Time].\n\nPlease arrive on time.\n\n- Institute Management`,
  },
  {
    id: 'workshop',
    title: '🏆 Special Workshop / Event Invite',
    text: (batchName: string) =>
      `🎨 *SPECIAL WORKSHOP INVITE*\n\nAttention *${batchName}*,\nYou are invited to join our upcoming Masterclass on [Insert Topic]!\n\n📅 Date: [Insert Date]\n📍 Venue: Main Studio\n\nDon't miss it!\n- Institute Management`,
  },
  {
    id: 'fee_due',
    title: '💳 General Fee Dues Reminder',
    text: (batchName: string) =>
      `💳 *FEE DUE REMINDER - ${batchName}*\n\nDear Students & Parents,\nThis is a gentle reminder to clear pending fee dues for the current term before [Insert Due Date].\n\nYou can pay via Cash or UPI at the institute counter.\nThank you!`,
  },
  {
    id: 'custom',
    title: '✏️ Custom Broadcast Message',
    text: (batchName: string) =>
      `📢 *NOTICE - ${batchName}*\n\nDear Students,\n[Type your custom announcement message here]\n\n- Institute Management`,
  },
]

export function WhatsAppStudioModal({ isOpen, onClose, initialBatchId }: WhatsAppStudioModalProps) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBatchId || '')
  const [students, setStudents] = useState<Student[]>([])
  const [templateId, setTemplateId] = useState<string>('holiday')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch active batches
  useEffect(() => {
    async function loadBatches() {
      const { data } = await supabase.from('batches').select('*, course:courses(name)')
      if (data) {
        setBatches(data)
        if (!selectedBatchId && data.length > 0) {
          setSelectedBatchId(data[0].id)
        }
      }
    }
    if (isOpen) {
      loadBatches()
    }
  }, [isOpen])

  // Update batch selection if prop changes
  useEffect(() => {
    if (initialBatchId) {
      setSelectedBatchId(initialBatchId)
    }
  }, [initialBatchId])

  // Fetch students for selected batch
  useEffect(() => {
    async function loadStudents() {
      if (!selectedBatchId) return
      setLoading(true)
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('batch_id', selectedBatchId)
        .eq('status', 'active')
      if (data) {
        setStudents(data)
      }
      setLoading(false)
    }
    loadStudents()
  }, [selectedBatchId])

  // Update message when template or batch changes
  const activeBatch = batches.find((b) => b.id === selectedBatchId)
  const activeBatchName = activeBatch?.name || 'Selected Batch'

  useEffect(() => {
    const t = TEMPLATES.find((item) => item.id === templateId)
    if (t) {
      setMessage(t.text(activeBatchName))
    }
  }, [templateId, selectedBatchId, activeBatchName])

  // Method A: Pre-filled WhatsApp Share (Opens WhatsApp with text pre-filled so you select any group)
  const handleShareWhatsAppWithText = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  // Method B: Open specific group link with clipboard copy
  const handleOpenGroupWhatsApp = () => {
    if (!activeBatch?.whatsapp_group_url) {
      toast.error('No WhatsApp Group link saved for this batch. Please add it in Batches settings.')
      return
    }

    navigator.clipboard.writeText(message)
    toast.success('Text copied! Just press Ctrl+V (or Paste) in WhatsApp chat box.')
    window.open(activeBatch.whatsapp_group_url, '_blank')
  }

  // Send individual WhatsApp message to a student
  const handleSendToStudent = (mobile: string) => {
    const cleanMobile = mobile.replace(/\D/g, '')
    const phone = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message)
    setCopied(true)
    toast.success('Broadcast text copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl p-4 sm:p-6 space-y-4 max-h-[88vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold leading-tight">
                WhatsApp Group & Broadcast Studio
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Post announcements to your WhatsApp Group or send individual messages
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {/* Target Batch */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Select Target Batch</Label>
            <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
              <SelectTrigger className="h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Select Batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs sm:text-sm">
                    {b.name} ({(b.course as unknown as { name: string })?.name || ''})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Preset */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Message Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Select Template" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs sm:text-sm">
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Message Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Broadcast Text</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground px-2"
              onClick={handleCopyMessage}
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy Text'}
            </Button>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="font-sans text-xs sm:text-sm bg-muted/20 resize-y"
          />
        </div>

        {/* WhatsApp Group Posting Options */}
        <div className="rounded-2xl border p-3.5 sm:p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs sm:text-sm">
              <Users className="h-4 w-4 shrink-0" />
              Send to {activeBatchName} WhatsApp Group
            </div>
            {activeBatch?.whatsapp_group_url && (
              <span className="text-[10px] bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full border border-emerald-500/20">
                Group Linked
              </span>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {/* Method A: Pre-filled WhatsApp Share */}
            <Button
              type="button"
              className="w-full h-9 sm:h-10 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-xs"
              onClick={handleShareWhatsAppWithText}
            >
              <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Share to Group (Pre-filled Text)
            </Button>

            {/* Method B: Open Direct Link */}
            {activeBatch?.whatsapp_group_url && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 sm:h-10 text-xs sm:text-sm border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 gap-1.5"
                onClick={handleOpenGroupWhatsApp}
              >
                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Open Group Link (Auto Copy)
              </Button>
            )}
          </div>

          <p className="text-[10px] sm:text-[11px] text-muted-foreground text-center leading-tight">
            <strong>Tip:</strong> Click <strong>Share to Group</strong> to open WhatsApp with text pre-filled, or click <strong>Copy Text</strong> and paste directly into your WhatsApp group.
          </p>
        </div>

        {/* Individual Student Messages */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              Or Send to Individual Students ({students.length})
            </Label>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground py-3 text-center">Loading batch students...</p>
          ) : students.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">No active students in this batch.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-xl border p-2.5 bg-background hover:bg-muted/40 transition-colors text-xs"
                >
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="font-medium text-foreground truncate">{student.full_name}</span>
                    <span className="text-muted-foreground text-[11px]">({student.student_mobile})</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950 self-end sm:self-auto shrink-0"
                    onClick={() => handleSendToStudent(student.student_mobile)}
                  >
                    <Send className="h-3 w-3" />
                    Send WA
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
