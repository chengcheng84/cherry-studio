import { Button, Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, Input } from '@cherrystudio/ui'
import { loggerService } from '@logger'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { cn } from '@renderer/utils'
import { ORIGIN_DEFAULT_MINI_APPS } from '@shared/data/presets/mini-apps'
import { Globe, ImagePlus, Plus, Upload, X } from 'lucide-react'
import type { ChangeEvent, FC, FormEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getCustomMiniAppIdError } from './utils'

interface Props {
  size?: number
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

const NewAppButton: FC<Props> = ({ size = 60 }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
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

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
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

    if (!normalizedId) {
      nextErrors.id = t('settings.miniapps.custom.id_error')
    }

    if (!normalizedName) {
      nextErrors.name = t('settings.miniapps.custom.name_error')
    }

    if (!normalizedUrl) {
      nextErrors.url = t('settings.miniapps.custom.url_error')
    }

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

    if (!validateForm()) {
      return
    }

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
      handleOpenChange(false)
    } catch (error) {
      window.toast.error(t('settings.miniapps.custom.save_error'))
      logger.error('Failed to save custom mini app:', error as Error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasLogoPreview = Boolean(formValues.logo)

  return (
    <>
      <button
        type="button"
        className="group flex w-[104px] flex-col items-center gap-2 rounded-[24px] px-2 py-2 text-center transition hover:bg-[var(--color-accent)]/70"
        onClick={() => setOpen(true)}>
        <span
          className="flex items-center justify-center rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] text-[var(--color-text-3)] transition group-hover:border-[var(--color-primary)] group-hover:bg-[var(--color-card)] group-hover:text-[var(--color-primary)]"
          style={{ width: size + 10, height: size + 10 }}>
          <Plus className="size-6" />
        </span>
        <span className="max-w-[88px] text-[12px] leading-4 text-[var(--color-text-3)] group-hover:text-[var(--color-text-1)]">
          {t('settings.miniapps.custom.title')}
        </span>
      </button>

      <Drawer open={open} direction="right" onOpenChange={handleOpenChange}>
        <DrawerContent className="right-0 h-full w-[min(460px,100vw)] max-w-none border-l border-[var(--color-border)] bg-[var(--color-background)] p-0">
          <DrawerHeader className="border-b border-[var(--color-border)] px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <DrawerTitle className="text-base text-[var(--color-text-1)]">
                  {t('settings.miniapps.custom.edit_title')}
                </DrawerTitle>
                <p className="text-sm text-[var(--color-text-3)]">{t('settings.miniapps.custom.title')}</p>
              </div>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full text-[var(--color-text-3)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-text-1)]"
                onClick={() => handleOpenChange(false)}
                aria-label={t('common.close')}>
                <X className="size-4" />
              </button>
            </div>
          </DrawerHeader>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-1)]" htmlFor="miniapp-id">
                  {t('settings.miniapps.custom.id')}
                </label>
                <Input
                  id="miniapp-id"
                  value={formValues.id}
                  onChange={handleFieldChange('id')}
                  placeholder={t('settings.miniapps.custom.id_placeholder')}
                  aria-invalid={Boolean(fieldErrors.id)}
                />
                {fieldErrors.id && <p className="text-sm text-[var(--color-destructive)]">{fieldErrors.id}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-1)]" htmlFor="miniapp-name">
                  {t('settings.miniapps.custom.name')}
                </label>
                <Input
                  id="miniapp-name"
                  value={formValues.name}
                  onChange={handleFieldChange('name')}
                  placeholder={t('settings.miniapps.custom.name_placeholder')}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name && <p className="text-sm text-[var(--color-destructive)]">{fieldErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-1)]" htmlFor="miniapp-url">
                  {t('settings.miniapps.custom.url')}
                </label>
                <Input
                  id="miniapp-url"
                  value={formValues.url}
                  onChange={handleFieldChange('url')}
                  placeholder={t('settings.miniapps.custom.url_placeholder')}
                  aria-invalid={Boolean(fieldErrors.url)}
                />
                {fieldErrors.url && <p className="text-sm text-[var(--color-destructive)]">{fieldErrors.url}</p>}
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-[var(--color-text-1)]">
                  {t('settings.miniapps.custom.logo')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                      logoType === 'url'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-2)] hover:bg-[var(--color-accent)]'
                    )}
                    onClick={() => handleLogoTypeChange('url')}>
                    <Globe className="size-4" />
                    {t('settings.miniapps.custom.logo_url')}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                      logoType === 'file'
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-2)] hover:bg-[var(--color-accent)]'
                    )}
                    onClick={() => handleLogoTypeChange('file')}>
                    <ImagePlus className="size-4" />
                    {t('settings.miniapps.custom.logo_file')}
                  </button>
                </div>

                {logoType === 'url' ? (
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--color-text-2)]" htmlFor="miniapp-logo-url">
                      {t('settings.miniapps.custom.logo_url_label')}
                    </label>
                    <Input
                      id="miniapp-logo-url"
                      value={formValues.logo}
                      onChange={handleFieldChange('logo')}
                      placeholder={t('settings.miniapps.custom.logo_url_placeholder')}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-[var(--color-text-2)]">
                      {t('settings.miniapps.custom.logo_upload_label')}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-center gap-2"
                      onClick={() => fileInputRef.current?.click()}>
                      <Upload className="size-4" />
                      {t('settings.miniapps.custom.logo_upload_button')}
                    </Button>
                    {fileName && <p className="text-sm text-[var(--color-text-3)]">{fileName}</p>}
                  </div>
                )}

                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-text-3)]">
                    {t('settings.miniapps.custom.logo')}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
                      {hasLogoPreview ? (
                        <img
                          src={formValues.logo}
                          alt={formValues.name || t('settings.miniapps.custom.title')}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Plus className="size-5 text-[var(--color-text-3)]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-text-1)]">
                        {formValues.name || t('settings.miniapps.custom.title')}
                      </p>
                      <p className="truncate text-sm text-[var(--color-text-3)]">
                        {formValues.url || t('settings.miniapps.custom.url_placeholder')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DrawerFooter className="border-t border-[var(--color-border)] px-5 py-4">
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {t('settings.miniapps.custom.save')}
                </Button>
              </div>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  )
}

export default NewAppButton
