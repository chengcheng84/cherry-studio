import { loggerService } from '@logger'
import store from '@renderer/store'
import { removeTab, setActiveTab } from '@renderer/store/tabs'
import type { MiniApp } from '@shared/data/types/miniApp'
import type { LRUCache } from 'lru-cache'

import NavigationService from './NavigationService'

const logger = loggerService.withContext('TabsService')

export class TabsService {
  private miniAppsCache: LRUCache<string, MiniApp> | null = null
  private closingTabIds = new Set<string>()

  public setMiniAppsCache(cache: LRUCache<string, MiniApp>) {
    this.miniAppsCache = cache
    logger.debug('Mini-apps cache reference set in TabsService')
  }

  public closeTab(tabId: string): boolean {
    if (this.closingTabIds.has(tabId)) {
      logger.debug(`Skipping recursive close for tab ${tabId}`)
      return false
    }

    this.closingTabIds.add(tabId)

    try {
      const state = store.getState()
      const tabs = state.tabs.tabs
      const activeTabId = state.tabs.activeTabId

      const tabToClose = tabs.find((tab) => tab.id === tabId)
      if (!tabToClose) {
        logger.warn(`Tab with id ${tabId} not found`)
        return false
      }

      if (tabs.length === 1) {
        logger.warn('Cannot close the last tab')
        return false
      }

      if (tabId === activeTabId) {
        const remainingTabs = tabs.filter((tab) => tab.id !== tabId)
        const lastTab = remainingTabs[remainingTabs.length - 1]

        store.dispatch(setActiveTab(lastTab.id))

        if (NavigationService.navigate) {
          void NavigationService.navigate({ to: lastTab.path })
        } else {
          logger.warn('Navigation service not ready, will navigate when ready')
          NavigationService.ready.onResolved(() => {
            if (NavigationService.navigate) {
              void NavigationService.navigate({ to: lastTab.path })
            }
          })
        }
      }

      this.cleanupMiniAppCache(tabId)
      store.dispatch(removeTab(tabId))

      logger.info(`Tab ${tabId} closed successfully`)
      return true
    } finally {
      this.closingTabIds.delete(tabId)
    }
  }

  private cleanupMiniAppCache(tabId: string) {
    const tabs = store.getState().tabs.tabs
    const tab = tabs.find((t) => t.id === tabId)

    if (tab && tab.path.startsWith('/app/mini-app/')) {
      const appId = tab.path.replace('/app/mini-app/', '')

      if (this.miniAppsCache && this.miniAppsCache.has(appId)) {
        logger.debug(`Cleaning up mini-app cache for app: ${appId}`)
        this.miniAppsCache.delete(appId)
        logger.info(`Mini-app ${appId} removed from cache due to tab closure`)
      }
    }
  }

  public getTabs() {
    return store.getState().tabs.tabs
  }

  public getActiveTabId() {
    return store.getState().tabs.activeTabId
  }

  public setActiveTab(tabId: string): boolean {
    const tabs = store.getState().tabs.tabs
    const tab = tabs.find((t) => t.id === tabId)

    if (!tab) {
      logger.warn(`Tab with id ${tabId} not found`)
      return false
    }

    store.dispatch(setActiveTab(tabId))

    if (NavigationService.navigate) {
      void NavigationService.navigate({ to: tab.path })
    }

    return true
  }
}

export const tabsService = new TabsService()
