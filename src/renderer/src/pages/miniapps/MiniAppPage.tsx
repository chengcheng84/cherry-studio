import { LogoAvatar } from '@renderer/components/Icons'
import { useMiniAppPopup } from '@renderer/hooks/useMiniAppPopup'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { useNavbarPosition } from '@renderer/hooks/useNavbar'
import { tabsService } from '@renderer/services/TabsService'
import { getWebviewLoaded, onWebviewStateChange, setWebviewLoaded } from '@renderer/utils/webviewStateManager'
import type { MiniApp } from '@shared/data/types/miniapp'
import { useNavigate, useParams } from '@tanstack/react-router'
import type { WebviewTag } from 'electron'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BeatLoader from 'react-spinners/BeatLoader'

import MiniAppFullPageView from './components/MiniAppFullPageView'
import MinimalToolbar from './components/MinimalToolbar'
import WebviewSearch from './components/WebviewSearch'

const MiniAppPage: FC = () => {
  const { appId } = useParams({ strict: false })
  const { isTopNavbar } = useNavbarPosition()
  const { openMiniAppKeepAlive, miniAppsCache } = useMiniAppPopup()
  const { allApps } = useMiniApps()
  const navigate = useNavigate()

  useEffect(() => {
    if (miniAppsCache) {
      tabsService.setMiniAppsCache(miniAppsCache)
    }
  }, [miniAppsCache])

  const app = useMemo((): MiniApp | null => {
    if (!appId) {
      return null
    }

    const found = allApps.find((item) => item.appId === appId)

    if (!found && miniAppsCache) {
      return miniAppsCache.get(appId) ?? null
    }

    return found ?? null
  }, [allApps, appId, miniAppsCache])

  useEffect(() => {
    if (!app) {
      void navigate({ to: '/app/miniapp' })
      return
    }

    openMiniAppKeepAlive(app)
  }, [app, navigate, openMiniAppKeepAlive])

  const webviewRef = useRef<WebviewTag | null>(null)
  const [isReady, setIsReady] = useState<boolean>(() => (app ? getWebviewLoaded(app.appId) : false))
  const [currentUrl, setCurrentUrl] = useState<string | null>(app?.url ?? null)
  const webviewCleanupRef = useRef<(() => void) | null>(null)

  const attachWebview = useCallback(() => {
    if (!app) {
      return true
    }

    const selector = `webview[data-miniapp-id="${app.appId}"]`
    const element = document.querySelector<WebviewTag>(selector)
    if (!element) {
      return false
    }

    if (webviewRef.current === element) {
      return true
    }

    webviewRef.current = element

    const handleInPageNav = (event: { url: string }) => setCurrentUrl(event.url)
    element.addEventListener('did-navigate-in-page', handleInPageNav as EventListener)

    webviewCleanupRef.current = () => {
      element.removeEventListener('did-navigate-in-page', handleInPageNav as EventListener)
    }

    return true
  }, [app])

  useEffect(() => {
    if (!app) {
      return
    }

    if (attachWebview()) {
      return () => webviewCleanupRef.current?.()
    }

    const observer = new MutationObserver(() => {
      if (attachWebview()) {
        observer.disconnect()
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      webviewCleanupRef.current?.()
    }
  }, [app, attachWebview])

  useEffect(() => {
    if (!app) {
      return
    }

    if (getWebviewLoaded(app.appId)) {
      if (!isReady) {
        setIsReady(true)
      }
      return
    }

    let mounted = true
    const unsubscribe = onWebviewStateChange(app.appId, (loaded) => {
      if (!mounted) {
        return
      }
      if (loaded) {
        setIsReady(true)
        unsubscribe()
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [app, isReady])

  if (!app) {
    return null
  }

  if (!isTopNavbar) {
    return <MiniAppFullPageView app={app} />
  }

  const handleReload = () => {
    if (webviewRef.current) {
      setWebviewLoaded(app.appId, false)
      setIsReady(false)
      webviewRef.current.src = app.url
      setCurrentUrl(app.url)
    }
  }

  return (
    <div className="pointer-events-none relative z-[3] flex h-full w-full flex-col">
      <div className="pointer-events-auto">
        <MinimalToolbar
          app={app}
          webviewRef={webviewRef}
          currentUrl={currentUrl}
          onReload={handleReload}
          onOpenDevTools={() => webviewRef.current?.openDevTools()}
        />
      </div>
      <div className="pointer-events-auto">
        <WebviewSearch webviewRef={webviewRef} isWebviewReady={isReady} appId={app.appId} />
      </div>
      {!isReady && (
        <div className="pointer-events-auto absolute inset-x-0 top-[35px] bottom-0 z-[4] flex flex-col items-center justify-center gap-3 bg-[var(--color-background)]">
          <LogoAvatar logo={app.logo} size={60} />
          <BeatLoader color="var(--color-text-2)" size={8} />
        </div>
      )}
    </div>
  )
}

export default MiniAppPage
