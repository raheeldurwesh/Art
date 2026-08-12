import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sun, Moon, Search, LogOut, User, ChevronRight, Menu, Bell, MessageCircle, CreditCard } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { calculateDynamicFee, formatCurrency, generateWhatsAppUrl } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'

interface HeaderProps {
  onMenuClick: () => void
  onSearchOpen: () => void
}

interface FeeNotification {
  studentId: string
  fullName: string
  mobile: string
  admissionNo: string
  monthsEnrolled: number
  remaining: number
}

const breadcrumbMap: Record<string, string> = {
  '/': 'Dashboard',
  '/admissions': 'Admissions',
  '/admissions/new': 'New Admission',
  '/students': 'Students',
  '/courses': 'Courses',
  '/batches': 'Batches',
  '/attendance': 'Attendance',
  '/fees': 'Fees',
  '/certificates': 'Certificates',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

function Breadcrumbs() {
  const location = useLocation()
  const pathSegments = location.pathname.split('/').filter(Boolean)

  const crumbs = [{ path: '/', label: 'Dashboard' }]
  let currentPath = ''

  for (const segment of pathSegments) {
    currentPath += `/${segment}`
    const label = breadcrumbMap[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1)
    crumbs.push({ path: currentPath, label })
  }

  if (crumbs.length === 1) return null

  return (
    <nav className="hidden sm:flex items-center text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 mx-1.5 shrink-0" />}
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-foreground truncate">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="hover:text-foreground transition-colors truncate">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}

export function Header({ onMenuClick, onSearchOpen }: HeaderProps) {
  const { signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { instituteName } = useSettings()
  const [notifications, setNotifications] = useState<FeeNotification[]>([])

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    try {
      const { data } = await supabase
        .from('fees')
        .select('*, student:students(id, full_name, admission_no, student_mobile, parent_mobile, admission_date, status, updated_at)')

      if (data) {
        const alerts: FeeNotification[] = []
        for (const item of data) {
          const student = item.student as any
          if (student && student.admission_date && student.status === 'active') {
            const dynamic = calculateDynamicFee(item.total_fee, student.admission_date, item.paid, student.status, student.updated_at)
            if (dynamic.remaining > 0) {
              alerts.push({
                studentId: student.id,
                fullName: student.full_name,
                mobile: student.student_mobile || student.parent_mobile || '',
                admissionNo: student.admission_no,
                monthsEnrolled: dynamic.monthsEnrolled,
                remaining: dynamic.remaining,
              })
            }
          }
        }
        setNotifications(alerts)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSearchOpen}
          className="hidden sm:flex items-center gap-2 text-muted-foreground px-3"
        >
          <Search className="h-4 w-4" />
          <span className="text-xs">Search...</span>
          <kbd className="ml-4 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground sm:flex">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={onSearchOpen}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'light' ? (
            <Moon className="h-[18px] w-[18px]" />
          ) : (
            <Sun className="h-[18px] w-[18px]" />
          )}
        </Button>

        {/* Fee Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" title="Monthly Fee Dues Notifications">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white animate-pulse">
                  {notifications.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[calc(100vw-2rem)] sm:w-80 p-0" align="end">
            <DropdownMenuLabel className="p-3 border-b flex items-center justify-between">
              <span className="font-semibold text-sm">Monthly Fee Dues</span>
              <span className="text-xs bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">
                {notifications.length} Due
              </span>
            </DropdownMenuLabel>
            <div className="max-h-80 overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  🎉 All student monthly fees are cleared!
                </div>
              ) : (
                notifications.map((item) => (
                  <div key={item.studentId} className="p-3 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/students/${item.studentId}`} className="text-xs font-semibold hover:underline block truncate">
                        {item.fullName} ({item.admissionNo})
                      </Link>
                      <p className="text-[11px] text-muted-foreground">
                        Month {item.monthsEnrolled} · <span className="text-red-600 font-semibold">{formatCurrency(item.remaining)} due</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                        title="Send WhatsApp Reminder"
                        onClick={() => {
                          const msg = `Dear ${item.fullName},\n\nThis is a friendly reminder from ${instituteName} that your monthly fee for month ${item.monthsEnrolled} is due.\nRemaining Balance: ${formatCurrency(item.remaining)}.\n\nPlease clear your payment at your earliest. Thank you!`
                          window.open(generateWhatsAppUrl(item.mobile, msg), '_blank')
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        title="Record Payment"
                        asChild
                      >
                        <Link to={`/fees/pay/${item.studentId}`}>
                          <CreditCard className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-2 border-t text-center bg-muted/20">
                <Link to="/fees" className="text-xs font-medium text-primary hover:underline">
                  View all in Fees Dashboard →
                </Link>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  AD
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Admin</p>
                <p className="text-xs leading-none text-muted-foreground">admin@institute.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
