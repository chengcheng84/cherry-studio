import { Slider, Switch } from '@cherrystudio/ui'
import { usePreference } from '@data/hooks/usePreference'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { ArrowRightLeft, RotateCcw, X } from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import MiniAppIconsManager from './MiniAppIconsManager'

const DEFAULT_MAX_KEEPALIVE = 3

const ToggleRow = ({
  title,
  description,
  checked,
  onChange
}: {
  title: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) => (
  <div className="flex items-center justify-between gap-3">
    <div>
      <span className="text-[10px] text-foreground/70">{title}</span>
      {description && <p className="text-[9px] text-muted-foreground/30">{description}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
)

const SegmentedButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={
      active
        ? 'rounded-md bg-accent px-2 py-1 text-[10px] text-foreground'
        : 'rounded-md px-2 py-1 text-[10px] text-muted-foreground/40 transition hover:text-foreground'
    }>
    {label}
  </button>
)

const MiniAppSettings: FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { t } = useTranslation()
  const [maxKeepAliveMiniApps, setMaxKeepAliveMiniApps] = usePreference('feature.mini_app.max_keep_alive')
  const [showOpenedMiniAppsInSidebar, setShowOpenedMiniAppsInSidebar] = usePreference(
    'feature.mini_app.show_opened_in_sidebar'
  )
  const [openLinkExternal, setOpenLinkExternal] = usePreference('feature.mini_app.open_link_external')
  const [miniAppRegion = 'auto', setMiniAppRegion] = usePreference('feature.mini_app.region')
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      <div className="flex h-11 items-center justify-between border-border/15 border-b px-4">
        <span className="text-[11px] text-foreground">{t('settings.miniapps.display_title')}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleSwapMiniApps}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground/40 transition hover:bg-accent hover:text-foreground">
            <ArrowRightLeft className="size-3" />
            {t('common.swap')}
          </button>
          <button
            type="button"
            onClick={handleResetMiniApps}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground/40 transition hover:bg-accent hover:text-foreground">
            <RotateCcw className="size-3" />
            {t('common.reset')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground/40 transition hover:bg-accent hover:text-foreground"
            aria-label={t('common.close')}>
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <MiniAppIconsManager
          visibleMiniApps={visibleMiniApps}
          disabledMiniApps={disabledMiniApps}
          setVisibleMiniApps={setVisibleMiniApps}
          setDisabledMiniApps={setDisabledMiniApps}
        />
      </div>

      <div className="space-y-3 border-border/15 border-t px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-foreground/70">{t('settings.miniapps.region.title')}</span>
            <p className="text-[9px] text-muted-foreground/30">{t('settings.miniapps.region.description')}</p>
          </div>
          <div className="flex items-center rounded-lg bg-background/50 p-1">
            <SegmentedButton
              active={miniAppRegion === 'auto'}
              label={t('settings.miniapps.region.auto')}
              onClick={() => void setMiniAppRegion('auto')}
            />
            <SegmentedButton active={miniAppRegion === 'CN'} label="CN" onClick={() => void setMiniAppRegion('CN')} />
            <SegmentedButton
              active={miniAppRegion === 'Global'}
              label={t('settings.miniapps.region.global')}
              onClick={() => void setMiniAppRegion('Global')}
            />
          </div>
        </div>

        <ToggleRow
          title={t('settings.miniapps.open_link_external.title')}
          checked={!!openLinkExternal}
          onChange={(checked) => void setOpenLinkExternal(checked)}
        />

        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-foreground/70">{t('settings.miniapps.cache_title')}</span>
            <p className="text-[9px] text-muted-foreground/30">{t('settings.miniapps.cache_description')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetCacheLimit}
              className="text-muted-foreground/25 transition hover:text-foreground"
              aria-label={t('common.reset')}>
              <RotateCcw className="size-3" />
            </button>
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
              className="w-16"
            />
            <span className="w-4 text-center text-[9px] text-muted-foreground/40">{sliderValue}</span>
          </div>
        </div>

        <ToggleRow
          title={t('settings.miniapps.sidebar_title')}
          description={t('settings.miniapps.sidebar_description')}
          checked={!!showOpenedMiniAppsInSidebar}
          onChange={(checked) => void setShowOpenedMiniAppsInSidebar(checked)}
        />
      </div>
    </div>
  )
}

export default MiniAppSettings
