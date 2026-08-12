import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { InstituteSettings } from '@/types'

interface SettingsContextType {
  settings: InstituteSettings | null
  instituteName: string
  upiId: string
  loading: boolean
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const DEFAULT_INSTITUTE_NAME = 'InstituteHub'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<InstituteSettings | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('institute_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching institute settings:', error)
      }

      if (data) {
        setSettings(data as InstituteSettings)
      }
    } catch (err) {
      console.error('Unexpected error fetching settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const instituteName = settings?.name?.trim() || DEFAULT_INSTITUTE_NAME
  const upiId = settings?.upi_id?.trim() || ''

  return (
    <SettingsContext.Provider
      value={{
        settings,
        instituteName,
        upiId,
        loading,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
