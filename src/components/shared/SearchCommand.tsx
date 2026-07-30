import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Users, BookOpen, Layers, ArrowRight, Phone } from 'lucide-react'

interface SearchItem {
  id: string
  type: 'student' | 'course' | 'batch' | 'page'
  title: string
  subtitle: string
  url: string
}

const staticPages: SearchItem[] = [
  { id: 'dashboard', type: 'page', title: 'Dashboard', subtitle: 'Overview & statistics', url: '/' },
  { id: 'new-admission', type: 'page', title: 'New Admission', subtitle: 'Register a new student', url: '/admissions/new' },
  { id: 'students', type: 'page', title: 'Students', subtitle: 'View all students', url: '/students' },
  { id: 'courses', type: 'page', title: 'Courses', subtitle: 'Manage courses', url: '/courses' },
  { id: 'batches', type: 'page', title: 'Batches', subtitle: 'Manage batches', url: '/batches' },
  { id: 'attendance', type: 'page', title: 'Attendance', subtitle: 'Mark attendance', url: '/attendance' },
  { id: 'fees', type: 'page', title: 'Fees', subtitle: 'Fee management', url: '/fees' },
  { id: 'certificates', type: 'page', title: 'Certificates', subtitle: 'Generate certificates', url: '/certificates' },
  { id: 'reports', type: 'page', title: 'Reports', subtitle: 'View reports', url: '/reports' },
  { id: 'settings', type: 'page', title: 'Settings', subtitle: 'Institute settings', url: '/settings' },
]

const typeIcons = {
  student: Users,
  course: BookOpen,
  batch: Layers,
  page: ArrowRight,
}

interface SearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchItem[]>(staticPages)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults(staticPages)
      setSearching(false)
      return
    }

    const q = query.toLowerCase().trim()
    const matchingPages = staticPages.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    )

    let isMounted = true
    setSearching(true)

    async function searchDatabase() {
      try {
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, full_name, admission_no, student_mobile, parent_mobile, course:courses(name)')
          .or(`full_name.ilike.%${q}%,admission_no.ilike.%${q}%,student_mobile.ilike.%${q}%,parent_mobile.ilike.%${q}%`)
          .limit(8)

        if (isMounted) {
          const studentItems: SearchItem[] = (studentsData || []).map((s) => ({
            id: s.id,
            type: 'student',
            title: s.full_name,
            subtitle: `Mobile: ${s.student_mobile || s.parent_mobile} · ${s.admission_no} · ${(s.course as unknown as { name: string })?.name || ''}`,
            url: `/students/${s.id}`,
          }))

          setResults([...studentItems, ...matchingPages])
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        if (isMounted) setSearching(false)
      }
    }

    const timer = setTimeout(() => {
      searchDatabase()
    }, 200)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [query])

  const handleSelect = useCallback(
    (item: SearchItem) => {
      navigate(item.url)
      onOpenChange(false)
      setQuery('')
    },
    [navigate, onOpenChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
          <Input
            placeholder="Search by student name, mobile number, admission no..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 shadow-none focus-visible:ring-0 h-12"
            autoFocus
          />
          {searching && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="space-y-0.5">
              {results.map((item, index) => {
                const Icon = typeIcons[item.type]
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                      index === selectedIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <div className="rounded-md bg-muted p-1.5 shrink-0">
                      {item.type === 'student' ? (
                        <Phone className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
