import { usePreference } from '@data/hooks/usePreference'
import { loggerService } from '@logger'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { useTabs } from '@renderer/hooks/useTabs'
import { clearWebviewState } from '@renderer/utils/webviewStateManager'
import type { MiniApp, MiniAppId } from '@shared/data/types/miniApp'
import { LRUCache } from 'lru-cache'
import { useCallback, useEffect, useRef } from 'react'

const logger = loggerService.withContext('useMiniAppPopup')

function brandId(raw: string): MiniAppId {
  return raw as MiniAppId
}

type MiniAppInput = Omit<MiniApp, 'appId' | 'kind' | 'status' | 'sortOrder'> & {
  appId: string
}

function toMiniApp(input: MiniAppInput): MiniApp {
  return {
    ...input,
    appId: brandId(input.appId),
    kind: 'default',
    status: 'enabled',
    sortOrder: 0
  }
}

let sharedCache: LRUCache<string, MiniApp> | undefined
let cacheVersion = 0

export const _resetMiniAppsCache = () => {
  sharedCache = undefined
  cacheVersion++
}

export const useMiniAppPopup = () => {
  const {
    allApps,
    openedKeepAliveMiniApps,
    currentMiniAppId,
    openedOneOffMiniApp,
    setOpenedKeepAliveMiniApps,
    setOpenedOneOffMiniApp,
    setCurrentMiniAppId,
    setMiniAppShow
  } = useMiniApps()
  const [maxKeepAliveMiniApps] = usePreference('feature.mini_app.max_keep_alive')
  const { tabs, openTab, closeTab } = useTabs()
  const tabsRef = useRef(tabs)
  const closeTabRef = useRef(closeTab)

  tabsRef.current = tabs
  closeTabRef.current = closeTab

  const callbacksRef = useRef({
    setOpenedKeepAliveMiniApps
  })
  callbacksRef.current = { setOpenedKeepAliveMiniApps }

  const createLRUCache = useCallback(() => {
    return new LRUCache<string, MiniApp>({
      max: maxKeepAliveMiniApps ?? 10,
      disposeAfter: (_value, key) => {
        try {
          clearWebviewState(key)

          const tabToClose = tabsRef.current.find((tab) => tab.url === `/app/mini-app/${key}`)
          if (tabToClose) {
            closeTabRef.current(tabToClose.id)
          }

          if (callbacksRef.current && sharedCache) {
            callbacksRef.current.setOpenedKeepAliveMiniApps(Array.from(sharedCache.values()))
          }
        } catch (error) {
          logger.error('Error in LRU disposeAfter callback', error as Error)
        }
      },
      onInsert: () => {
        try {
          if (callbacksRef.current && sharedCache) {
            callbacksRef.current.setOpenedKeepAliveMiniApps(Array.from(sharedCache.values()))
          }
        } catch (error) {
          logger.error('Error in LRU onInsert callback', error as Error)
        }
      },
      updateAgeOnGet: true,
      updateAgeOnHas: true
    })
  }, [maxKeepAliveMiniApps])

  const prevMaxKeepAlive = useRef(maxKeepAliveMiniApps)
  const prevCacheVersion = useRef(cacheVersion)

  if (!sharedCache) {
    sharedCache = createLRUCache()
    prevMaxKeepAlive.current = maxKeepAliveMiniApps
    prevCacheVersion.current = cacheVersion
  }

  useEffect(() => {
    const prev = prevMaxKeepAlive.current
    const current = maxKeepAliveMiniApps
    const wasReset = prevCacheVersion.current !== cacheVersion

    if (wasReset) {
      sharedCache = createLRUCache()
      prevMaxKeepAlive.current = current
      prevCacheVersion.current = cacheVersion
      return
    }

    if (prev === current) return
    prevMaxKeepAlive.current = current

    const oldEntries = Array.from(sharedCache!.entries()).reverse()
    sharedCache = createLRUCache()
    oldEntries.forEach(([key, value]) => {
      sharedCache!.set(key, value)
    })
  }, [maxKeepAliveMiniApps, createLRUCache])

  const activateMiniAppTab = useCallback(
    (app: MiniApp) => {
      if (sharedCache && !sharedCache.get(app.appId)) {
        sharedCache.set(app.appId, app)
      }

      setOpenedOneOffMiniApp(null)
      setCurrentMiniAppId(app.appId)
      setMiniAppShow(true)
      openTab(`/app/mini-app/${app.appId}`, {
        id: `miniapp:${app.appId}`,
        title: app.name,
        type: 'route'
      })
    },
    [openTab, setOpenedOneOffMiniApp, setCurrentMiniAppId, setMiniAppShow]
  )

  const openMiniApp = useCallback(
    (app: MiniApp, _keepAlive: boolean = false) => {
      activateMiniAppTab(app)
    },
    [activateMiniAppTab]
  )

  const openMiniAppKeepAlive = useCallback(
    (app: MiniApp) => {
      activateMiniAppTab(app)
    },
    [activateMiniAppTab]
  )

  const openMiniAppById = useCallback(
    (id: string, _keepAlive: boolean = false) => {
      const appDef = allApps.find((app) => app.appId === id)
      if (appDef) {
        activateMiniAppTab(appDef)
      }
    },
    [activateMiniAppTab, allApps]
  )

  const closeMiniApp = useCallback(
    (appid: string) => {
      const miniAppTab = tabs.find((tab) => tab.url === `/app/mini-app/${appid}`)

      if (miniAppTab) {
        closeTab(miniAppTab.id)
      }

      if (openedKeepAliveMiniApps.some((item) => item.appId === appid) && sharedCache) {
        sharedCache.delete(appid)
      }

      if (!miniAppTab && openedOneOffMiniApp?.appId === appid) {
        setOpenedOneOffMiniApp(null)
      }

      if (currentMiniAppId === appid) {
        setCurrentMiniAppId('')
        setMiniAppShow(false)
      }
    },
    [
      closeTab,
      currentMiniAppId,
      openedKeepAliveMiniApps,
      openedOneOffMiniApp,
      setOpenedOneOffMiniApp,
      setCurrentMiniAppId,
      setMiniAppShow,
      tabs
    ]
  )

  const closeAllMiniApps = useCallback(() => {
    const miniAppTabs = tabs.filter((tab) => tab.url.startsWith('/app/mini-app/'))

    for (const tab of miniAppTabs) {
      closeTab(tab.id)
    }

    sharedCache = createLRUCache()
    setOpenedKeepAliveMiniApps([])
    setOpenedOneOffMiniApp(null)
    setCurrentMiniAppId('')
    setMiniAppShow(false)
  }, [
    closeTab,
    createLRUCache,
    setOpenedKeepAliveMiniApps,
    setOpenedOneOffMiniApp,
    setCurrentMiniAppId,
    setMiniAppShow,
    tabs
  ])

  const hideMiniAppPopup = useCallback(() => {
    if (openedOneOffMiniApp) {
      setOpenedOneOffMiniApp(null)
    }
  }, [openedOneOffMiniApp, setOpenedOneOffMiniApp])

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
    miniAppsCache: sharedCache
  }
}
