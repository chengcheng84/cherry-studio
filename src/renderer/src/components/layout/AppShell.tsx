import '@renderer/databases'

import useMacTransparentWindow from '@renderer/hooks/useMacTransparentWindow'
import { useMiniAppPopup } from '@renderer/hooks/useMiniAppPopup'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { cn } from '@renderer/utils'
import { getDefaultRouteTitle } from '@renderer/utils/routeTitle'
import { Activity } from 'react'
import { useEffect } from 'react'

import { useTabs } from '../../hooks/useTabs'
import Sidebar from '../app/Sidebar'
import { AppShellTabBar } from './AppShellTabBar'
import { TabRouter } from './TabRouter'

// Mock Webview component (TODO: Replace with actual MiniApp/Webview)
const WebviewContainer = ({ url, isActive }: { url: string; isActive: boolean }) => (
  <Activity mode={isActive ? 'visible' : 'hidden'}>
    <div className="flex h-full w-full flex-col items-center justify-center bg-background">
      <div className="mb-2 font-bold text-lg">Webview App</div>
      <code className="rounded bg-muted p-2">{url}</code>
    </div>
  </Activity>
)

export const AppShell = () => {
  const isMacTransparentWindow = useMacTransparentWindow()
  const { tabs, activeTabId, setActiveTab, closeTab, updateTab, addTab, reorderTabs, pinTab, unpinTab } = useTabs()
  const { allApps, setCurrentMiniAppId, setMiniAppShow } = useMiniApps()
  const { closeMiniApp } = useMiniAppPopup()

  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  const getRouteTabTitle = (url: string, fallbackTitle?: string) => {
    const match = /^\/app\/mini-app\/([^/]+)/.exec(url)
    if (!match) {
      return getDefaultRouteTitle(url)
    }

    const appId = decodeURIComponent(match[1])
    const app = allApps.find((item) => item.appId === appId)
    return app?.name || fallbackTitle || getDefaultRouteTitle(url)
  }

  useEffect(() => {
    const activeUrl = activeTab?.url ?? ''
    if (activeUrl.startsWith('/app/mini-app/')) {
      const appId = activeUrl.replace('/app/mini-app/', '')
      setCurrentMiniAppId(appId)
      setMiniAppShow(true)
      return
    }

    setCurrentMiniAppId('')
    setMiniAppShow(false)
  }, [activeTab?.url, setCurrentMiniAppId, setMiniAppShow])

  // Sync internal navigation back to tab state with default title
  const handleUrlChange = (tabId: string, url: string) => {
    const currentTab = tabs.find((tab) => tab.id === tabId)
    updateTab(tabId, { url, title: getRouteTabTitle(url, currentTab?.title) })
  }

  const handleCloseTab = (tabId: string) => {
    const tab = tabs.find((item) => item.id === tabId)
    if (!tab) {
      return
    }

    const match = /^\/app\/mini-app\/([^/]+)/.exec(tab.url)
    if (match) {
      closeMiniApp(decodeURIComponent(match[1]))
      return
    }

    closeTab(tabId)
  }

  return (
    <div
      className={cn(
        'flex h-screen w-screen flex-col overflow-hidden text-foreground',
        isMacTransparentWindow ? 'bg-transparent' : 'bg-sidebar'
      )}>
      {/* Zone 1: Tab Bar (spans full width) */}
      <AppShellTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        setActiveTab={setActiveTab}
        closeTab={handleCloseTab}
        addTab={addTab}
        reorderTabs={reorderTabs}
        pinTab={pinTab}
        unpinTab={unpinTab}
      />

      {/* Zone 2: Main Area (Sidebar + Content) */}
      <div className="flex h-full w-full flex-1 flex-row overflow-hidden">
        {/* Zone 2a: Sidebar */}
        <Sidebar />

        {/* Zone 2b: Content Area - Multi MemoryRouter Architecture */}
        <div className="flex min-w-0 flex-1 flex-col pr-2 pb-2">
          <main className="relative flex-1 overflow-hidden rounded-[16px] bg-background">
            {/* Route Tabs: Only render non-dormant tabs */}
            {tabs
              .filter((t) => t.type === 'route' && !t.isDormant)
              .map((tab) => (
                <TabRouter
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  onUrlChange={(url) => handleUrlChange(tab.id, url)}
                />
              ))}

            {/* Webview Tabs: Only render non-dormant tabs */}
            {tabs
              .filter((t) => t.type === 'webview' && !t.isDormant)
              .map((tab) => (
                <WebviewContainer key={tab.id} url={tab.url} isActive={tab.id === activeTabId} />
              ))}
          </main>
        </div>
      </div>
    </div>
  )
}
