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
