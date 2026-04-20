import { useMiniAppPopup } from '@renderer/hooks/useMiniAppPopup'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import type { MiniApp } from '@shared/data/types/miniApp'
import { useNavigate, useParams } from '@tanstack/react-router'
import type { FC } from 'react'
import { useEffect, useMemo } from 'react'

import MiniAppFullPageView from './components/MiniAppFullPageView'

const MiniAppPage: FC = () => {
  const { appId } = useParams({ strict: false })
  const { openMiniAppKeepAlive, miniAppsCache } = useMiniAppPopup()
  const { allApps } = useMiniApps()
  const navigate = useNavigate()

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
      void navigate({ to: '/app/mini-app' })
      return
    }

    openMiniAppKeepAlive(app)
  }, [app, navigate, openMiniAppKeepAlive])

  if (!app) {
    return null
  }

  return <MiniAppFullPageView app={app} />
}

export default MiniAppPage
