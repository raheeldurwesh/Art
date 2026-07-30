import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { settingsSchema, type SettingsFormData } from '@/schemas'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useSettings } from '@/contexts/SettingsContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Upload, Building2, User, Palette, Shield, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { refreshSettings } = useSettings()
  const [loading, setLoading] = useState(true)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    const { data } = await supabase.from('institute_settings').select('*').single()
    if (data) {
      reset({
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        director_name: data.director_name,
      })
      if (data.logo_url) setLogoPreview(data.logo_url)
      if (data.director_signature_url) setSignaturePreview(data.director_signature_url)
    }
    setLoading(false)
  }

  async function onSubmit(data: SettingsFormData) {
    try {
      const { error } = await supabase
        .from('institute_settings')
        .upsert({ id: 'default', ...data, updated_at: new Date().toISOString() })
      if (error) throw error
      await refreshSettings()
      toast.success('Settings saved successfully!')
    } catch {
      toast.error('Failed to save settings')
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('institute-assets')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('institute-assets')
        .getPublicUrl(fileName)

      await supabase
        .from('institute_settings')
        .upsert({ id: 'default', logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })

      await refreshSettings()
      setLogoPreview(urlData.publicUrl)
      toast.success('Logo updated!')
    } catch {
      toast.error('Failed to upload logo')
    }
  }

  async function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `signature.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('institute-assets')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('institute-assets')
        .getPublicUrl(fileName)

      await supabase
        .from('institute_settings')
        .upsert({ id: 'default', director_signature_url: urlData.publicUrl, updated_at: new Date().toISOString() })

      await refreshSettings()
      setSignaturePreview(urlData.publicUrl)
      toast.success('Director signature updated!')
    } catch {
      toast.error('Failed to upload signature')
    }
  }

  async function removeLogo() {
    try {
      await supabase
        .from('institute_settings')
        .upsert({ id: 'default', logo_url: null, updated_at: new Date().toISOString() })

      await refreshSettings()
      setLogoPreview(null)
      toast.success('Logo removed successfully')
    } catch {
      toast.error('Failed to remove logo')
    }
  }

  async function removeSignature() {
    try {
      await supabase
        .from('institute_settings')
        .upsert({ id: 'default', director_signature_url: null, updated_at: new Date().toISOString() })

      await refreshSettings()
      setSignaturePreview(null)
      toast.success('Signature removed successfully')
    } catch {
      toast.error('Failed to remove signature')
    }
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newPassword = formData.get('new_password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password updated successfully!');
      (e.target as HTMLFormElement).reset()
    } catch (error) {
      toast.error('Failed to update password')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="Settings" description="Manage your institute settings" />

      {/* Institute Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Institute Profile</CardTitle>
                <CardDescription>Update your institute information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Logo & Signature Upload */}
            <div className="grid gap-6 sm:grid-cols-2 mb-6">
              <div>
                <Label className="mb-2 block">Institute Logo</Label>
                <div className="flex items-center gap-3">
                  <div className="h-20 w-20 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted/30 shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label>
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-1.5" />
                          Upload Logo
                        </span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                    {logoPreview && (
                      <Button variant="ghost" size="sm" onClick={removeLogo} className="text-destructive hover:bg-destructive/10 justify-start h-8 px-2">
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Director / Owner Signature</Label>
                <div className="flex items-center gap-3">
                  <div className="h-20 w-36 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted/30 p-1 shrink-0">
                    {signaturePreview ? (
                      <img src={signaturePreview} alt="Signature" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground text-center">No Signature</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label>
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-1.5" />
                          Upload Signature
                        </span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                    </label>
                    {signaturePreview && (
                      <Button variant="ghost" size="sm" onClick={removeSignature} className="text-destructive hover:bg-destructive/10 justify-start h-8 px-2">
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Remove Signature
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Institute Name *</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" {...register('phone')} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea id="address" {...register('address')} />
                {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="director_name">Director Name *</Label>
                <Input id="director_name" {...register('director_name')} />
                {errors.director_name && <p className="text-xs text-destructive">{errors.director_name.message}</p>}
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Toggle between light and dark theme</p>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Security</CardTitle>
                <CardDescription>Update your password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input id="new_password" name="new_password" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <Input id="confirm_password" name="confirm_password" type="password" placeholder="••••••••" />
              </div>
              <Button type="submit" variant="outline">
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Account Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            Logged in as: <span className="font-medium text-foreground">{user?.email}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
