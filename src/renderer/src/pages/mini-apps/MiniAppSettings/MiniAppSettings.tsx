import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
  Tooltip
} from '@cherrystudio/ui'
import { usePreference } from '@data/hooks/usePreference'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import type { MiniAppRegionFilter } from '@shared/data/types/miniApp'
import { ArrowRightLeft, Info, RotateCcw } from 'lucide-react'
import type { FC, ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import MiniAppIconsManager from './MiniAppIconsManager'

const DEFAULT_MAX_KEEPALIVE = 3

const Section = ({ children }: { children: ReactNode }) => (
  <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.4)]">
    {children}
  </section>
)

const SectionHeader = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <div className="mb-4 flex items-start justify-between gap-4">
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-[var(--color-text-1)]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[var(--color-text-3)]">{description}</p>}
    </div>
    {action}
  </div>
)

const PreferenceRow = ({
  title,
  description,
  control
}: {
  title: ReactNode
  description?: string
  control: ReactNode
}) => (
  <div className="flex flex-col gap-3 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium text-[var(--color-text-1)]">{title}</div>
      {description && <p className="mt-1 text-sm text-[var(--color-text-3)]">{description}</p>}
    </div>
    <div className="shrink-0">{control}</div>
  </div>
)

const RegionSelector: FC = () => {
  const { t } = useTranslation()
  const [miniAppRegion = 'auto', setMiniAppRegion] = usePreference('feature.mini_app.region')

  return (
    <Select value={miniAppRegion} onValueChange={(value) => void setMiniAppRegion(value as MiniAppRegionFilter)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">{t('settings.miniapps.region.auto')}</SelectItem>
        <SelectItem value="CN">{t('settings.miniapps.region.cn')}</SelectItem>
        <SelectItem value="Global">{t('settings.miniapps.region.global')}</SelectItem>
      </SelectContent>
    </Select>
  )
}

const MiniAppSettings: FC = () => {
  const { t } = useTranslation()
  const [maxKeepAliveMiniApps, setMaxKeepAliveMiniApps] = usePreference('feature.mini_app.max_keep_alive')
  const [showOpenedMiniAppsInSidebar, setShowOpenedMiniAppsInSidebar] = usePreference(
    'feature.mini_app.show_opened_in_sidebar'
  )
  const [openLinkExternal, setOpenLinkExternal] = usePreference('feature.mini_app.open_link_external')
  const { miniapps, disabled, updateMiniApps, updateDisabledMiniApps } = useMiniApps()

  const [visibleMiniApps, setVisibleMiniApps] = useState(miniapps)
  const [disabledMiniApps, setDisabledMiniApps] = useState(disabled || [])
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sliderValue = maxKeepAliveMiniApps ?? DEFAULT_MAX_KEEPALIVE

  useEffect(() => {
    setVisibleMiniApps(miniapps)
    setDisabledMiniApps(disabled || [])
  }, [miniapps, disabled])

  const handleResetMiniApps = useCallback(() => {
    setVisibleMiniApps(miniapps)
    setDisabledMiniApps([])
    void updateMiniApps(miniapps)
    void updateDisabledMiniApps([])
  }, [miniapps, updateDisabledMiniApps, updateMiniApps])

  const handleSwapMiniApps = useCallback(() => {
    const temp = visibleMiniApps
    setVisibleMiniApps(disabledMiniApps)
    setDisabledMiniApps(temp)
  }, [disabledMiniApps, visibleMiniApps])

  const handleResetCacheLimit = useCallback(() => {
    void setMaxKeepAliveMiniApps(DEFAULT_MAX_KEEPALIVE)
    window.toast.info(t('settings.miniapps.cache_change_notice'))
  }, [setMaxKeepAliveMiniApps, t])

  const handleCacheChange = useCallback(
    (value: number) => {
      void setMaxKeepAliveMiniApps(value)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        window.toast.info(t('settings.miniapps.cache_change_notice'))
        debounceTimerRef.current = null
      }, 500)
    },
    [setMaxKeepAliveMiniApps, t]
  )

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--color-background-soft)] px-5 py-5">
      <div className="flex flex-col gap-5">
        <Section>
          <SectionHeader
            title={t('settings.miniapps.display_title')}
            action={
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={handleSwapMiniApps}>
                  <ArrowRightLeft className="size-4" />
                  {t('common.swap')}
                </Button>
                <Button type="button" variant="outline" className="gap-2" onClick={handleResetMiniApps}>
                  <RotateCcw className="size-4" />
                  {t('common.reset')}
                </Button>
              </div>
            }
          />
          <MiniAppIconsManager
            visibleMiniApps={visibleMiniApps}
            disabledMiniApps={disabledMiniApps}
            setVisibleMiniApps={setVisibleMiniApps}
            setDisabledMiniApps={setDisabledMiniApps}
          />
        </Section>

        <Section>
          <SectionHeader title={t('settings.miniapps.region.title')} />
          <PreferenceRow
            title={
              <span className="inline-flex items-center gap-2">
                <span>{t('settings.miniapps.region.title')}</span>
                <Tooltip content={t('settings.miniapps.region.description')} placement="right">
                  <span className="inline-flex size-5 items-center justify-center rounded-full text-[var(--color-text-3)]">
                    <Info className="size-4" />
                  </span>
                </Tooltip>
              </span>
            }
            control={<RegionSelector />}
          />
        </Section>

        <Section>
          <SectionHeader title={t('settings.miniapps.open_link_external.title')} />
          <div className="space-y-3">
            <PreferenceRow
              title={t('settings.miniapps.open_link_external.title')}
              control={
                <Switch checked={!!openLinkExternal} onCheckedChange={(checked) => void setOpenLinkExternal(checked)} />
              }
            />
            <PreferenceRow
              title={t('settings.miniapps.cache_title')}
              description={t('settings.miniapps.cache_description')}
              control={
                <div className="w-full min-w-[220px] max-w-[280px] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-text-1)]">{sliderValue}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleResetCacheLimit}
                      aria-label={t('common.reset')}>
                      <RotateCcw className="size-4" />
                    </Button>
                  </div>
                  <Slider
                    min={1}
                    max={10}
                    value={[sliderValue]}
                    onValueChange={(values) => {
                      const nextValue = values[0]
                      if (typeof nextValue === 'number') {
                        handleCacheChange(nextValue)
                      }
                    }}
                    marks={[
                      { value: 1, label: '1' },
                      { value: 5, label: '5' },
                      { value: 10, label: 'Max' }
                    ]}
                    showValueLabel
                    formatValueLabel={(value) => `${value}`}
                  />
                </div>
              }
            />
            <PreferenceRow
              title={t('settings.miniapps.sidebar_title')}
              description={t('settings.miniapps.sidebar_description')}
              control={
                <Switch
                  checked={!!showOpenedMiniAppsInSidebar}
                  onCheckedChange={(checked) => void setShowOpenedMiniAppsInSidebar(checked)}
                />
              }
            />
          </div>
        </Section>
      </div>
    </div>
  )
}

export default MiniAppSettings
