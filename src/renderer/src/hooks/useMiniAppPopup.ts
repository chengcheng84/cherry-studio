import { usePreference } from '@data/hooks/usePreference'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import NavigationService from '@renderer/services/NavigationService'
import { tabsService } from '@renderer/services/TabsService'
import { clearWebviewState } from '@renderer/utils/webviewStateManager'
import type { MiniApp, MiniAppId } from '@shared/data/types/miniapp'
import { LRUCache } from 'lru-cache'
import { useCallback, useEffect, useRef } from 'react'

/** Brand a raw string as MiniAppId. Safe — caller controls the string. */
function brandId(raw: string): MiniAppId {
  return raw as MiniAppId
}

type MiniAppInput = Omit<MiniApp, 'appId' | 'type' | 'status' | 'sortOrder'> & {
  appId: string
}

function toMiniApp(input: MiniAppInput): MiniApp {
  return {
    ...input,
    appId: brandId(input.appId),
    type: 'default',
    status: 'enabled',
    sortOrder: 0
  }
}

let miniAppsCache: LRUCache<string, MiniApp>

/**
 * Refs to hold callback functions that need to be updated on each render.
 * This allows the LRU cache callbacks to always use the latest setters.
 */
let cacheCallbacksRef: {
  setOpenedKeepAliveMiniApps: (apps: MiniApp[]) => void
} | null = null

/**
 * Cache version counter for tracking cache resets.
 * Used to force re-initialization when the cache is reset externally.
 */
let cacheVersion = 0

/**
 * Reset the module-level cache. For testing purposes only.
 * @internal
 */
export const _resetMiniAppsCache = () => {
  miniAppsCache = undefined as unknown as LRUCache<string, MiniApp>
  cacheCallbacksRef = null
  cacheVersion++
}

/**
 * Usage:
 *
 *   To control miniapp opening/closing, you can use the following hooks:
 *     import { useMiniAppPopup } from '@renderer/hooks/useMiniAppPopup'
 *
 *   in the component:
 *     const { openMiniApp, openMiniAppKeepAlive, openMiniAppById,
 *             closeMiniApp, hideMiniAppPopup, closeAllMiniApps } = useMiniAppPopup()
 *
 *   To use some key miniapp UI states:
 *     import { useMiniApps } from '@renderer/hooks/useMiniApps'
 *     const { openedKeepAliveMiniApps, openedOneOffMiniApp, miniAppShow } = useMiniApps()
 */
export const useMiniAppPopup = () => {
  const {
    allApps,
    openedKeepAliveMiniApps,
    currentMiniAppId,
    openedOneOffMiniApp,
    miniAppShow,
    setOpenedKeepAliveMiniApps,
    setOpenedOneOffMiniApp,
    setCurrentMiniAppId,
    setMiniAppShow
  } = useMiniApps()
  const [maxKeepAliveMiniApps] = usePreference('feature.miniapp.max_keep_alive')

  // Update the ref on every render so callbacks always have latest setters
  cacheCallbacksRef = {
    setOpenedKeepAliveMiniApps
  }

  const createLRUCache = useCallback(() => {
    return new LRUCache<string, MiniApp>({
      max: maxKeepAliveMiniApps ?? 10,
      disposeAfter: (_value, key) => {
        // Clean up WebView state when app is disposed from cache
        clearWebviewState(key)

        // Close corresponding tab if it exists
        const tabs = tabsService.getTabs()
        const tabToClose = tabs.find((tab) => tab.path === `/app/miniapp/${key}`)
        if (tabToClose) {
          tabsService.closeTab(tabToClose.id)
        }

        // Update cache state using ref (always has latest setter)
        if (cacheCallbacksRef && miniAppsCache) {
          cacheCallbacksRef.setOpenedKeepAliveMiniApps(Array.from(miniAppsCache.values()))
        }
      },
      onInsert: () => {
        // Update cache state using ref (always has latest setter)
        if (cacheCallbacksRef && miniAppsCache) {
          cacheCallbacksRef.setOpenedKeepAliveMiniApps(Array.from(miniAppsCache.values()))
        }
      },
      updateAgeOnGet: true,
      updateAgeOnHas: true
    })
  }, [maxKeepAliveMiniApps])

  // Track previous maxKeepAliveMiniApps to detect changes
  const prevMaxKeepAlive = useRef(maxKeepAliveMiniApps)
  // Track cache version to detect external resets
  const prevCacheVersion = useRef(cacheVersion)

  // Initialize cache synchronously if not already initialized
  if (!miniAppsCache) {
    miniAppsCache = createLRUCache()
    prevMaxKeepAlive.current = maxKeepAliveMiniApps
    prevCacheVersion.current = cacheVersion
  }

  // Handle cache resize when maxKeepAliveMiniApps changes or external reset
  useEffect(() => {
    const prev = prevMaxKeepAlive.current
    const current = maxKeepAliveMiniApps

    // Check if cache was reset externally (version changed)
    const wasReset = prevCacheVersion.current !== cacheVersion

    // Handle external reset
    if (wasReset) {
      miniAppsCache = createLRUCache()
      prevMaxKeepAlive.current = current
      prevCacheVersion.current = cacheVersion
      return
    }

    // Handle cache resize when maxKeepAliveMiniApps changes
    if (prev === current) return
    prevMaxKeepAlive.current = current

    // Always rebuild cache when max changes
    // LRU cache mechanism: entries set later are placed first, so reverse
    const oldEntries = Array.from(miniAppsCache.entries()).reverse()
    miniAppsCache = createLRUCache()
    // Add entries up to the new max (LRU cache will evict excess automatically)
    oldEntries.forEach(([key, value]) => {
      miniAppsCache.set(key, value)
    })
  }, [maxKeepAliveMiniApps, createLRUCache])

  /** Open a miniapp in the v2 tab flow. */
  const navigateToMiniAppTab = useCallback((appId: string) => {
    const targetPath = `/app/miniapp/${appId}`

    if (NavigationService.navigate) {
      void NavigationService.navigate({ to: targetPath })
      return
    }

    setTimeout(() => {
      if (NavigationService.navigate) {
        void NavigationService.navigate({ to: targetPath })
      }
    }, 0)
  }, [])

  const activateMiniAppTab = useCallback(
    (app: MiniApp) => {
      if (miniAppsCache && !miniAppsCache.get(app.appId)) {
        miniAppsCache.set(app.appId, app)
      }

      setOpenedOneOffMiniApp(null)
      setCurrentMiniAppId(app.appId)
      setMiniAppShow(true)
      navigateToMiniAppTab(app.appId)
    },
    [navigateToMiniAppTab, setOpenedOneOffMiniApp, setCurrentMiniAppId, setMiniAppShow]
  )

  const openMiniApp = useCallback(
    (app: MiniApp, _keepAlive: boolean = false) => {
      activateMiniAppTab(app)
    },
    [activateMiniAppTab]
  )

  /** Backward-compatible wrapper; miniapps now always open as tabs. */
  const openMiniAppKeepAlive = useCallback(
    (app: MiniApp) => {
      activateMiniAppTab(app)
    },
    [activateMiniAppTab]
  )

  /** Open a miniapp by id (look up the miniapp in allApps from DataApi) */
  const openMiniAppById = useCallback(
    (id: string, _keepAlive: boolean = false) => {
      const appDef = allApps.find((app) => app.appId === id)
      if (appDef) {
        activateMiniAppTab(appDef)
      }
    },
    [activateMiniAppTab, allApps]
  )

  /** Close a miniapp tab and clear related cached UI state. */
  const closeMiniApp = useCallback(
    (appid: string) => {
      const tabs = tabsService.getTabs()
      const miniAppTab = tabs.find((tab) => tab.path === `/app/miniapp/${appid}`)

      if (miniAppTab) {
        tabsService.closeTab(miniAppTab.id)
        return
      }

      if (openedKeepAliveMiniApps.some((item) => item.appId === appid) && miniAppsCache) {
        miniAppsCache.delete(appid)
      }

      if (openedOneOffMiniApp?.appId === appid) {
        setOpenedOneOffMiniApp(null)
      }

      if (currentMiniAppId === appid) {
        setCurrentMiniAppId('')
        setMiniAppShow(false)
      }
    },
    [
      currentMiniAppId,
      openedKeepAliveMiniApps,
      openedOneOffMiniApp,
      setOpenedOneOffMiniApp,
      setCurrentMiniAppId,
      setMiniAppShow
    ]
  )

  /** Close all miniapp tabs and clear related cached UI state. */
  const closeAllMiniApps = useCallback(() => {
    const miniAppTabs = tabsService.getTabs().filter((tab) => tab.path.startsWith('/app/miniapp/'))

    for (const tab of miniAppTabs) {
      tabsService.closeTab(tab.id)
    }

    miniAppsCache = createLRUCache()
    setOpenedKeepAliveMiniApps([])
    setOpenedOneOffMiniApp(null)
    setCurrentMiniAppId('')
    setMiniAppShow(false)
  }, [createLRUCache, setOpenedKeepAliveMiniApps, setOpenedOneOffMiniApp, setCurrentMiniAppId, setMiniAppShow])

  /** Backward-compatible hide helper; now just clears miniapp active UI state. */
  const hideMiniAppPopup = useCallback(() => {
    if (!miniAppShow) return

    if (openedOneOffMiniApp) {
      setOpenedOneOffMiniApp(null)
    }

    setCurrentMiniAppId('')
    setMiniAppShow(false)
  }, [miniAppShow, openedOneOffMiniApp, setOpenedOneOffMiniApp, setCurrentMiniAppId, setMiniAppShow])

  /** Smart open miniapp; miniapps now always open as tabs. */
  const openSmartMiniApp = useCallback(
    (config: MiniAppInput, _keepAlive: boolean = false) => {
      const app = toMiniApp(config)
      activateMiniAppTab(app)
    },
    [activateMiniAppTab]
  )

  return {
    openMiniApp,
    openMiniAppKeepAlive,
    openMiniAppById,
    closeMiniApp,
    hideMiniAppPopup,
    closeAllMiniApps,
    openSmartMiniApp,
    // Expose cache instance for TabsService integration
    miniAppsCache
  }
}
