import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function generateWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  const phoneWithCountry = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
    case 'completed':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
    case 'dropped':
    case 'inactive':
      return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
    case 'pending':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
    default:
      return 'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-400'
  }
}

export function calculateMonthsEnrolled(admissionDate: string | Date, endDate?: string | Date | null): number {
  const start = new Date(admissionDate)
  const end = endDate ? new Date(endDate) : new Date()

  if (isNaN(start.getTime())) return 1

  const yearsDiff = end.getFullYear() - start.getFullYear()
  const monthsDiff = end.getMonth() - start.getMonth()
  
  const totalMonths = yearsDiff * 12 + monthsDiff + 1
  return Math.max(1, totalMonths)
}

export function calculateDynamicFee(
  monthlyRate: number,
  admissionDate: string,
  totalPaid: number,
  status: string,
  updatedAt?: string
) {
  const isFinished = status === 'completed' || status === 'dropped'
  const months = calculateMonthsEnrolled(admissionDate, isFinished ? updatedAt : null)
  const totalFee = Math.max(monthlyRate, months * monthlyRate)
  const remaining = Math.max(0, totalFee - totalPaid)
  
  return {
    monthsEnrolled: months,
    totalFee,
    paid: totalPaid,
    remaining,
    status: remaining <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'
  }
}
