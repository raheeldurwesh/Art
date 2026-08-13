import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { batchSchema, type BatchFormData } from '@/schemas'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { WhatsAppStudioModal } from '@/components/shared/WhatsAppStudioModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Plus, Edit, Trash2, Users, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Batch, Course } from '@/types'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false)
  const [broadcastBatchId, setBroadcastBatchId] = useState<string | undefined>()
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null)
  const [selectedDays, setSelectedDays] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [{ data: batchesData }, { data: coursesData }] = await Promise.all([
      supabase.from('batches').select('*, course:courses(name)').order('name'),
      supabase.from('courses').select('*').eq('status', 'active').order('name'),
    ])
    setBatches((batchesData as Batch[]) || [])
    setCourses((coursesData as Course[]) || [])
    setLoading(false)
  }

  function openAddForm() {
    setEditingBatch(null)
    setSelectedDays([])
    reset({ name: '', course_id: '', start_time: '09:00', end_time: '11:00', days: [], max_students: 30, status: 'active', whatsapp_group_url: '' })
    setFormOpen(true)
  }

  function openEditForm(batch: Batch) {
    setEditingBatch(batch)
    setSelectedDays(batch.days || [])
    reset({
      name: batch.name,
      course_id: batch.course_id,
      start_time: batch.start_time,
      end_time: batch.end_time,
      days: batch.days,
      max_students: batch.max_students,
      status: batch.status,
      whatsapp_group_url: batch.whatsapp_group_url || '',
    })
    setFormOpen(true)
  }

  function toggleDay(day: string) {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day]
    setSelectedDays(newDays)
    setValue('days', newDays)
  }

  async function onSubmit(data: BatchFormData) {
    try {
      if (editingBatch) {
        const { error } = await supabase.from('batches').update(data).eq('id', editingBatch.id)
        if (error) throw error
        toast.success('Batch updated')
      } else {
        const { error } = await supabase.from('batches').insert(data)
        if (error) throw error
        toast.success('Batch created')
      }
      setFormOpen(false)
      fetchData()
    } catch {
      toast.error('Failed to save batch')
    }
  }

  async function handleDelete() {
    if (!deletingBatch) return
    try {
      const { error } = await supabase.from('batches').delete().eq('id', deletingBatch.id)
      if (error) throw error
      toast.success('Batch deleted')
      setDeleteOpen(false)
      fetchData()
    } catch {
      toast.error('Cannot delete batch with enrolled students')
    }
  }

  const columns: Column<Batch>[] = [
    {
      key: 'name',
      header: 'Batch Name',
      sortable: true,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'course_id',
      header: 'Course',
      cell: (row) => (row.course as unknown as { name: string })?.name || '-',
    },
    {
      key: 'start_time',
      header: 'Time',
      cell: (row) => <span className="text-sm">{row.start_time} - {row.end_time}</span>,
    },
    {
      key: 'days',
      header: 'Days',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.days?.map((d) => (
            <Badge key={d} variant="secondary" className="text-[10px] px-1.5">{d.slice(0, 3)}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'whatsapp_group_url',
      header: 'WhatsApp Group',
      cell: (row) => (
        row.whatsapp_group_url ? (
          <a
            href={row.whatsapp_group_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Group Linked
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Not Linked</span>
        )
      ),
    },
    {
      key: 'max_students',
      header: 'Capacity',
      cell: (row) => (
        <span className="flex items-center gap-1 text-sm">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {row.max_students}
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
      className: 'w-28 text-right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
            title="Broadcast Message"
            onClick={(e) => {
              e.stopPropagation()
              setBroadcastBatchId(row.id)
              setWhatsappModalOpen(true)
            }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditForm(row) }}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingBatch(row); setDeleteOpen(true) }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        description="Manage course batches and schedules"
        actions={[
          {
            label: 'WhatsApp Broadcast',
            icon: MessageCircle,
            variant: 'outline',
            onClick: () => {
              setBroadcastBatchId(undefined)
              setWhatsappModalOpen(true)
            },
          },
          { label: 'Add Batch', icon: Plus, onClick: openAddForm },
        ]}
      />

      <DataTable
        data={batches}
        columns={columns}
        searchPlaceholder="Search batches..."
        searchKey={(row) => `${row.name} ${(row.course as unknown as { name: string })?.name || ''}`}
        loading={loading}
        emptyTitle="No batches yet"
        emptyDescription="Create your first batch to start scheduling classes."
      />

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBatch ? 'Edit Batch' : 'Add New Batch'}</DialogTitle>
            <DialogDescription>
              {editingBatch ? 'Update the batch details.' : 'Create a new batch for a course.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Batch Name *</Label>
              <Input placeholder="e.g., Morning Batch A" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Course *</Label>
              <Select
                defaultValue={editingBatch?.course_id}
                onValueChange={(val) => setValue('course_id', val)}
              >
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.course_id && <p className="text-xs text-destructive">{errors.course_id.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input type="time" {...register('start_time')} />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input type="time" {...register('end_time')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Days *</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
                  >
                    <Checkbox
                      checked={selectedDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <span className="text-sm">{day.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
              {errors.days && <p className="text-xs text-destructive">{errors.days.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>WhatsApp Group Link (Optional)</Label>
              <Input
                placeholder="e.g., https://chat.whatsapp.com/ABC123xyz..."
                {...register('whatsapp_group_url')}
              />
              <p className="text-[11px] text-muted-foreground">
                Paste your batch's WhatsApp Group invite link to send 1-click broadcasts.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Max Students</Label>
              <Input type="number" min={1} {...register('max_students')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingBatch ? 'Update' : 'Create Batch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Batch"
        description={`Are you sure you want to delete "${deletingBatch?.name}"?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* WhatsApp Broadcast & Group Studio Modal */}
      <WhatsAppStudioModal
        isOpen={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
        initialBatchId={broadcastBatchId}
      />
    </div>
  )
}
