import { type ReactNode } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: {
    label: string
    icon?: LucideIcon
    onClick: () => void
    variant?: ButtonProps['variant']
  }[]
  children?: ReactNode
}

export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 className="text-2xl font-bold font-heading tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions?.map((action) => (
          <Button
            key={action.label}
            variant={action.variant || 'default'}
            onClick={action.onClick}
            size="sm"
          >
            {action.icon && <action.icon className="h-4 w-4 mr-1.5" />}
            {action.label}
          </Button>
        ))}
        {children}
      </div>
    </motion.div>
  )
}
