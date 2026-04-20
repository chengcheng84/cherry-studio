import { Button, Input } from '@cherrystudio/ui'
import { loggerService } from '@logger'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { cn } from '@renderer/utils'
import { ORIGIN_DEFAULT_MINI_APPS } from '@shared/data/presets/mini-apps'
import { Link, Plus, Upload, X } from 'lucide-react'
import type { ChangeEvent, FC, FormEvent, ReactNode } from 'react'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getCustomMiniAppIdError } from './utils'

interface NewAppButtonProps {
  size?: number
  compact?: boolean
  onClick?: () => void
}

interface MiniAppCreatePanelProps {
  onClose: () => void
}

interface FormValues {
  id: string
  name: string
  url: string
  logo: string
}

const logger = loggerService.withContext('NewAppButton')

const DEFAULT_FORM_VALUES: FormValues = {
  id: '',
  name: '',
  url: '',
  logo: ''
}

const CUSTOM_ID_ERROR_TRANSLATIONS = {
  conflicting_ids: 'settings.miniapps.custom.conflicting_ids',
  duplicate_ids: 'settings.miniapps.custom.duplicate_ids'
} as const

const FormField = ({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) => (
  <div className="space-y-1">
    <label className="block text-[10px] text-muted-foreground/50">
      {required && <span className="mr-0.5 text-red-400/60">*</span>}
      {label}
    </label>
    {children}
  </div>
)

const NewAppButton: FC<NewAppButtonProps> = ({ size = 60, compact = false, onClick }) => {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      className={cn(
        compact
          ? 'group flex flex-col items-center gap-1.5'
          : 'group flex w-[104px] flex-col items-center gap-2 rounded-[24px] px-2 py-2 text-center transition hover:bg-accent/70'
      )}
      onClick={onClick}>
      <span
        className={cn(
          compact
            ? 'flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 border-dashed text-muted-foreground/70 transition group-hover:border-primary/40 group-hover:text-primary/70'
            : 'flex items-center justify-center rounded-[24px] border border-border border-dashed bg-background text-muted-foreground transition group-hover:border-primary group-hover:bg-card group-hover:text-primary'
        )}
        style={compact ? undefined : { width: size + 10, height: size + 10 }}>
        <Plus className={cn(compact ? 'size-4' : 'size-6')} />
      </span>
      <span
        className={cn(
          compact
            ? 'max-w-[60px] truncate text-[10px] text-muted-foreground/70 transition group-hover:text-foreground'
            : 'max-w-[88px] text-[12px] text-muted-foreground leading-4 transition group-hover:text-foreground'
        )}>
        {t('settings.miniapps.custom.title')}
      </span>
    </button>
  )
}

export const MiniAppCreatePanel: FC<MiniAppCreatePanelProps> = ({ onClose }) => {
  const { t } = useTranslation()
  const [logoType, setLogoType] = useState<'url' | 'file'>('url')
  const [formValues, setFormValues] = useState<FormValues>(DEFAULT_FORM_VALUES)
  const [fileName, setFileName] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { allApps, createCustomMiniApp } = useMiniApps()

  const presetIds = useMemo(() => new Set(ORIGIN_DEFAULT_MINI_APPS.map((app) => app.id)), [])
  const existingIds = useMemo(() => new Set(allApps.map((app) => app.appId)), [allApps])

  const resetForm = () => {
    setFormValues(DEFAULT_FORM_VALUES)
    setFieldErrors({})
    setFileName('')
    setLogoType('url')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleFieldChange = (field: keyof FormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setFormValues((current) => ({ ...current, [field]: value }))

    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  const handleLogoTypeChange = (nextLogoType: 'url' | 'file') => {
    setLogoType(nextLogoType)
    setFileName('')
    setFormValues((current) => ({ ...current, logo: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setFileName('')
      setFormValues((current) => ({ ...current, logo: '' }))
      return
    }

    try {
      const base64Logo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
            return
          }
          reject(new Error('FileReader result is not a string'))
        }
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })

      setFileName(file.name)
      setFormValues((current) => ({ ...current, logo: base64Logo }))
      window.toast.success(t('settings.miniapps.custom.logo_upload_success'))
    } catch (error) {
      logger.error('Failed to read file:', error as Error)
      window.toast.error(t('settings.miniapps.custom.logo_upload_error'))
    }
  }

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof FormValues, string>> = {}
    const normalizedId = formValues.id.trim()
    const normalizedName = formValues.name.trim()
    const normalizedUrl = formValues.url.trim()

    if (!normalizedId) nextErrors.id = t('settings.miniapps.custom.id_error')
    if (!normalizedName) nextErrors.name = t('settings.miniapps.custom.name_error')
    if (!normalizedUrl) nextErrors.url = t('settings.miniapps.custom.url_error')

    if (normalizedId) {
      const idError = getCustomMiniAppIdError({
        appId: normalizedId,
        presetIds,
        existingIds
      })

      if (idError) {
        nextErrors.id = t(CUSTOM_ID_ERROR_TRANSLATIONS[idError], { ids: normalizedId })
      }
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      await createCustomMiniApp({
        appId: formValues.id.trim(),
        name: formValues.name.trim(),
        url: formValues.url.trim(),
        logo: formValues.logo || 'application',
        bordered: false,
        supportedRegions: ['CN', 'Global']
      })

      window.toast.success(t('settings.miniapps.custom.save_success'))
      handleClose()
    } catch (error) {
      window.toast.error(t('settings.miniapps.custom.save_error'))
      logger.error('Failed to save custom mini app:', error as Error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasLogoPreview = Boolean(formValues.logo)

  return (
    <section className="absolute top-2 right-2 bottom-2 z-50 flex w-[380px] flex-col overflow-hidden rounded-[8px] border border-border/30 bg-card shadow-2xl">
      <div className="flex h-11 items-center justify-between border-border/15 border-b px-4">
        <span className="text-[11px] text-foreground">{t('settings.miniapps.custom.edit_title')}</span>
        <button
          type="button"
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground/40 transition hover:bg-accent hover:text-foreground"
          onClick={handleClose}
          aria-label={t('common.close')}>
          <X className="size-3.5" />
        </button>
      </div>

      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col items-center py-4">
            {hasLogoPreview ? (
              <img src={formValues.logo} alt="" className="h-14 w-14 rounded-xl object-cover shadow-sm" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-lg text-primary-foreground shadow-sm">
                {formValues.name.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <span className="mt-2 text-[11px] text-foreground/70">
              {formValues.name || t('settings.miniapps.custom.title')}
            </span>
          </div>

          <div className="space-y-3">
            <FormField label="ID" required>
              <Input
                value={formValues.id}
                onChange={handleFieldChange('id')}
                placeholder={t('settings.miniapps.custom.id_placeholder')}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.id)}
                className="h-9 rounded-lg border-border/30 bg-accent/5 text-[11px] text-foreground shadow-none placeholder:text-muted-foreground/25 focus-visible:border-border/50 focus-visible:ring-0 disabled:opacity-40"
              />
              {fieldErrors.id && <p className="text-[10px] text-destructive">{fieldErrors.id}</p>}
            </FormField>

            <FormField label={t('settings.miniapps.custom.name')} required>
              <Input
                value={formValues.name}
                onChange={handleFieldChange('name')}
                placeholder={t('settings.miniapps.custom.name_placeholder')}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.name)}
                className="h-9 rounded-lg border-border/30 bg-accent/5 text-[11px] text-foreground shadow-none placeholder:text-muted-foreground/25 focus-visible:border-border/50 focus-visible:ring-0 disabled:opacity-40"
              />
              {fieldErrors.name && <p className="text-[10px] text-destructive">{fieldErrors.name}</p>}
            </FormField>

            <FormField label="URL" required>
              <Input
                value={formValues.url}
                onChange={handleFieldChange('url')}
                placeholder="https://example.com"
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.url)}
                className="h-9 rounded-lg border-border/30 bg-accent/5 font-mono text-[11px] text-foreground shadow-none placeholder:text-muted-foreground/25 focus-visible:border-border/50 focus-visible:ring-0 disabled:opacity-40"
              />
              {fieldErrors.url && <p className="text-[10px] text-destructive">{fieldErrors.url}</p>}
            </FormField>

            <FormField label={t('settings.miniapps.custom.logo')}>
              <div className="mb-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleLogoTypeChange('url')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] transition-colors',
                    logoType === 'url' ? 'bg-accent text-foreground' : 'text-muted-foreground/40 hover:text-foreground'
                  )}>
                  <Link className="size-3" /> URL
                </button>
                <button
                  type="button"
                  onClick={() => handleLogoTypeChange('file')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] transition-colors',
                    logoType === 'file' ? 'bg-accent text-foreground' : 'text-muted-foreground/40 hover:text-foreground'
                  )}>
                  <Upload className="size-3" /> {t('settings.miniapps.custom.logo_upload_button')}
                </button>
              </div>

              {logoType === 'url' ? (
                <Input
                  value={formValues.logo}
                  onChange={handleFieldChange('logo')}
                  placeholder={t('settings.miniapps.custom.logo_url_placeholder')}
                  className="h-9 rounded-lg border-border/30 bg-accent/5 font-mono text-[11px] text-foreground shadow-none placeholder:text-muted-foreground/25 focus-visible:border-border/50 focus-visible:ring-0"
                />
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/30 border-dashed bg-accent/5 px-3 py-2 transition hover:border-border/50">
                  <Upload className="size-3 text-muted-foreground/30" />
                  <span className="text-[10px] text-muted-foreground/40">
                    {fileName || t('settings.miniapps.custom.logo_upload_label')}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {hasLogoPreview && (
                    <img src={formValues.logo} alt="" className="ml-auto h-5 w-5 rounded object-cover" />
                  )}
                </label>
              )}
            </FormField>
          </div>
        </div>

        <div className="flex items-center gap-2 border-border/15 border-t px-4 py-3">
          <Button type="submit" disabled={isSubmitting} className="h-8 rounded-lg px-4 text-[11px]">
            {t('settings.miniapps.custom.save')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-8 rounded-lg px-3 text-[11px] text-muted-foreground/50 hover:bg-accent hover:text-foreground">
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </section>
  )
}

export default NewAppButton
