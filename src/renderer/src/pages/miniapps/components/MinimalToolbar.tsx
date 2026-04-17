import { Tooltip } from '@cherrystudio/ui'
import { usePreference } from '@data/hooks/usePreference'
import { loggerService } from '@logger'
import { isDev } from '@renderer/config/constant'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { tabsService } from '@renderer/services/TabsService'
import { cn } from '@renderer/utils'
import type { MiniApp } from '@shared/data/types/miniapp'
import { ArrowLeft, ArrowRight, Code2, ExternalLink, Link2, Minimize2, Pin, RotateCw } from 'lucide-react'
import type { WebviewTag } from 'electron'
import type { FC, ReactNode, RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const logger = loggerService.withContext('MinimalToolbar')

const WEBVIEW_CHECK_INITIAL_MS = 100
const WEBVIEW_CHECK_MAX_MS = 1000
const WEBVIEW_CHECK_MULTIPLIER = 2
const WEBVIEW_CHECK_MAX_ATTEMPTS = 30
const NAVIGATION_UPDATE_DELAY_MS = 50
const NAVIGATION_COMPLETE_DELAY_MS = 100

interface Props {
  app: MiniApp
  webviewRef: RefObject<WebviewTag | null>
  currentUrl: string | null
  onReload: () => void
  onOpenDevTools: () => void
}

interface ToolbarIconButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: ReactNode
}

const ToolbarIconButton = ({ label, onClick, disabled, active, children }: ToolbarIconButtonProps) => (
  <button
    type="button"
    className={cn(
      'flex size-8 items-center justify-center rounded-full transition',
      disabled
        ? 'cursor-default text-[var(--color-text-3)] opacity-50'
        : active
          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/14'
          : 'text-[var(--color-text-2)] hover:bg-[var(--color-accent)] hover:text-[var(--color-text-1)]'
    )}
    onClick={disabled ? undefined : onClick}
    aria-label={label}
    aria-disabled={disabled}
    aria-pressed={active}>
    {children}
  </button>
)

const MinimalToolbar: FC<Props> = ({ app, webviewRef, currentUrl, onReload, onOpenDevTools }) => {
  const { t } = useTranslation()
  const { pinned, updatePinnedMiniApps, allApps } = useMiniApps()
  const [openLinkExternal, setOpenLinkExternal] = usePreference('feature.miniapp.open_link_external')
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const canPinned = allApps.some((item) => item.appId === app.appId)
  const isPinned = pinned.some((item) => item.appId === app.appId)
  const canOpenExternalLink = app.url.startsWith('http://') || app.url.startsWith('https://')
  const navigationUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const updateNavigationState = useCallback(() => {
    if (webviewRef.current) {
      try {
        setCanGoBack(webviewRef.current.canGoBack())
        setCanGoForward(webviewRef.current.canGoForward())
      } catch (_error) {
        logger.debug('WebView not ready for navigation state update', { appId: app.appId })
        setCanGoBack(false)
        setCanGoForward(false)
      }
    } else {
      setCanGoBack(false)
      setCanGoForward(false)
    }
  }, [app.appId, webviewRef])

  const scheduleNavigationUpdate = useCallback(
    (delay: number) => {
      if (navigationUpdateTimeoutRef.current) {
        clearTimeout(navigationUpdateTimeoutRef.current)
      }

      navigationUpdateTimeoutRef.current = setTimeout(() => {
        updateNavigationState()
        navigationUpdateTimeoutRef.current = null
      }, delay)
    },
    [updateNavigationState]
  )

  useEffect(() => {
    return () => {
      if (navigationUpdateTimeoutRef.current) {
        clearTimeout(navigationUpdateTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let checkTimeout: NodeJS.Timeout | null = null
    let navigationListener: (() => void) | null = null
    let listenersAttached = false
    let currentInterval = WEBVIEW_CHECK_INITIAL_MS
    let attemptCount = 0

    const attachListeners = () => {
      if (webviewRef.current && !listenersAttached) {
        updateNavigationState()

        const handleNavigation = () => {
          scheduleNavigationUpdate(NAVIGATION_UPDATE_DELAY_MS)
        }

        webviewRef.current.addEventListener('did-navigate', handleNavigation)
        webviewRef.current.addEventListener('did-navigate-in-page', handleNavigation)
        listenersAttached = true

        navigationListener = () => {
          if (webviewRef.current) {
            webviewRef.current.removeEventListener('did-navigate', handleNavigation)
            webviewRef.current.removeEventListener('did-navigate-in-page', handleNavigation)
          }
          listenersAttached = false
        }

        if (checkTimeout) {
          clearTimeout(checkTimeout)
          checkTimeout = null
        }

        logger.debug('Navigation listeners attached', { appId: app.appId, attempts: attemptCount })
        return true
      }

      return false
    }

    const scheduleCheck = () => {
      checkTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          attemptCount++
          if (!attachListeners()) {
            if (attemptCount >= WEBVIEW_CHECK_MAX_ATTEMPTS) {
              logger.warn('WebView attachment timeout', {
                appId: app.appId,
                attempts: attemptCount,
                totalTimeMs: currentInterval * attemptCount
              })
              return
            }

            currentInterval = Math.min(currentInterval * WEBVIEW_CHECK_MULTIPLIER, WEBVIEW_CHECK_MAX_MS)

            if (attemptCount <= 3 || attemptCount % 10 === 0) {
              logger.debug('WebView not ready, scheduling next check', {
                appId: app.appId,
                nextCheckMs: currentInterval,
                attempt: attemptCount
              })
            }

            scheduleCheck()
          }
        })
      }, currentInterval)
    }

    if (!webviewRef.current) {
      scheduleCheck()
    } else {
      attachListeners()
    }

    return () => {
      if (checkTimeout) {
        clearTimeout(checkTimeout)
      }
      if (navigationListener) {
        navigationListener()
      }
    }
  }, [app.appId, scheduleNavigationUpdate, updateNavigationState, webviewRef])

  const handleGoBack = useCallback(() => {
    if (webviewRef.current) {
      try {
        if (webviewRef.current.canGoBack()) {
          webviewRef.current.goBack()
          scheduleNavigationUpdate(NAVIGATION_COMPLETE_DELAY_MS)
        }
      } catch (_error) {
        logger.debug('WebView not ready for navigation', { appId: app.appId, action: 'goBack' })
      }
    }
  }, [app.appId, scheduleNavigationUpdate, webviewRef])

  const handleGoForward = useCallback(() => {
    if (webviewRef.current) {
      try {
        if (webviewRef.current.canGoForward()) {
          webviewRef.current.goForward()
          scheduleNavigationUpdate(NAVIGATION_COMPLETE_DELAY_MS)
        }
      } catch (_error) {
        logger.debug('WebView not ready for navigation', { appId: app.appId, action: 'goForward' })
      }
    }
  }, [app.appId, scheduleNavigationUpdate, webviewRef])

  const handleMinimize = useCallback(() => {
    const closed = tabsService.closeTab(`miniapp:${app.appId}`)
    if (!closed) {
      logger.warn('Failed to close miniapp tab from toolbar', { appId: app.appId })
    }
  }, [app.appId])

  const handleTogglePin = useCallback(() => {
    const newPinned = isPinned ? pinned.filter((item) => item.appId !== app.appId) : [...pinned, app]
    void updatePinnedMiniApps(newPinned)
  }, [app, isPinned, pinned, updatePinnedMiniApps])

  const handleToggleOpenExternal = useCallback(() => {
    void setOpenLinkExternal(!openLinkExternal)
  }, [openLinkExternal, setOpenLinkExternal])

  const handleOpenLink = useCallback(() => {
    const urlToOpen = currentUrl || app.url
    void window.api.openWebsite(urlToOpen)
  }, [app.url, currentUrl])

  return (
    <div className="flex h-[35px] shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-background)] px-3">
      <div className="flex items-center gap-1">
        <Tooltip content={t('miniapp.popup.goBack')} placement="bottom">
          <ToolbarIconButton label={t('miniapp.popup.goBack')} onClick={handleGoBack} disabled={!canGoBack}>
            <ArrowLeft className="size-4" />
          </ToolbarIconButton>
        </Tooltip>
        <Tooltip content={t('miniapp.popup.goForward')} placement="bottom">
          <ToolbarIconButton label={t('miniapp.popup.goForward')} onClick={handleGoForward} disabled={!canGoForward}>
            <ArrowRight className="size-4" />
          </ToolbarIconButton>
        </Tooltip>
        <Tooltip content={t('miniapp.popup.refresh')} placement="bottom">
          <ToolbarIconButton label={t('miniapp.popup.refresh')} onClick={onReload}>
            <RotateCw className="size-4" />
          </ToolbarIconButton>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1">
        {canOpenExternalLink && (
          <Tooltip content={t('miniapp.popup.openExternal')} placement="bottom">
            <ToolbarIconButton label={t('miniapp.popup.openExternal')} onClick={handleOpenLink}>
              <ExternalLink className="size-4" />
            </ToolbarIconButton>
          </Tooltip>
        )}

        {canPinned && (
          <Tooltip
            content={isPinned ? t('miniapp.remove_from_launchpad') : t('miniapp.add_to_launchpad')}
            placement="bottom">
            <ToolbarIconButton
              label={isPinned ? t('miniapp.remove_from_launchpad') : t('miniapp.add_to_launchpad')}
              onClick={handleTogglePin}
              active={isPinned}>
              <Pin className="size-4" />
            </ToolbarIconButton>
          </Tooltip>
        )}

        <Tooltip
          content={openLinkExternal ? t('miniapp.popup.open_link_external_on') : t('miniapp.popup.open_link_external_off')}
          placement="bottom">
          <ToolbarIconButton
            label={openLinkExternal ? t('miniapp.popup.open_link_external_on') : t('miniapp.popup.open_link_external_off')}
            onClick={handleToggleOpenExternal}
            active={!!openLinkExternal}>
            <Link2 className="size-4" />
          </ToolbarIconButton>
        </Tooltip>

        {isDev && (
          <Tooltip content={t('miniapp.popup.devtools')} placement="bottom">
            <ToolbarIconButton label={t('miniapp.popup.devtools')} onClick={onOpenDevTools}>
              <Code2 className="size-4" />
            </ToolbarIconButton>
          </Tooltip>
        )}

        <Tooltip content={t('miniapp.popup.minimize')} placement="bottom">
          <ToolbarIconButton label={t('miniapp.popup.minimize')} onClick={handleMinimize}>
            <Minimize2 className="size-4" />
          </ToolbarIconButton>
        </Tooltip>
      </div>
    </div>
  )
}

export default MinimalToolbar
