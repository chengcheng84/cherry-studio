import { loggerService } from '@logger'
import MiniAppIcon from '@renderer/components/Icons/MiniAppIcon'
import IndicatorLight from '@renderer/components/IndicatorLight'
import MarqueeText from '@renderer/components/MarqueeText'
import { useMiniAppPopup } from '@renderer/hooks/useMiniAppPopup'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { useNavbarPosition } from '@renderer/hooks/useNavbar'
import { cn } from '@renderer/utils'
import type { MiniApp } from '@shared/data/types/miniApp'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import MiniAppContextMenu from './MiniAppContextMenu'

interface Props {
  app: MiniApp
  onClick?: () => void
  size?: number
  isLast?: boolean
}

const logger = loggerService.withContext('App')

const MiniApp: FC<Props> = ({ app, onClick, size = 60, isLast }) => {
  const { openMiniAppKeepAlive } = useMiniAppPopup()
  const { t } = useTranslation()
  const {
    miniapps,
    pinned,
    disabled,
    openedKeepAliveMiniApps,
    currentMiniAppId,
    miniAppShow,
    setOpenedKeepAliveMiniApps,
    updateMiniApps,
    updateDisabledMiniApps,
    updatePinnedMiniApps,
    removeCustomMiniApp
  } = useMiniApps()
  const isPinned = pinned.some((p) => p.appId === app.appId)
  const isVisible = miniapps.some((m) => m.appId === app.appId)
  const shouldShow = isVisible || isPinned
  const isActive = miniAppShow && currentMiniAppId === app.appId
  const isOpened = openedKeepAliveMiniApps.some((item) => item.appId === app.appId)
  const { isTopNavbar } = useNavbarPosition()

  const displayName = isLast ? t('settings.miniapps.custom.title') : app.nameKey ? t(app.nameKey) : app.name

  const handleClick = () => {
    openMiniAppKeepAlive(app)
    onClick?.()
  }

  const menuItems = [
    {
      key: 'togglePin',
      label: isPinned
        ? isTopNavbar
          ? t('miniapp.remove_from_launchpad')
          : t('miniapp.remove_from_sidebar')
        : isTopNavbar
          ? t('miniapp.add_to_launchpad')
          : t('miniapp.add_to_sidebar'),
      onClick: () => {
        const newPinned = isPinned ? pinned.filter((item) => item.appId !== app.appId) : [...pinned, app]
        void updatePinnedMiniApps(newPinned)
      }
    },
    ...(!isPinned
      ? [
          {
            key: 'hide',
            label: t('miniapp.sidebar.hide.title'),
            onClick: () => {
              const newMiniApps = miniapps.filter((item) => item.appId !== app.appId)
              void updateMiniApps(newMiniApps)
              const newDisabled = [...(disabled || []), app]
              void updateDisabledMiniApps(newDisabled)
              const newOpenedKeepAliveMiniApps = openedKeepAliveMiniApps.filter((item) => item.appId !== app.appId)
              setOpenedKeepAliveMiniApps(newOpenedKeepAliveMiniApps)
            }
          }
        ]
      : []),
    ...(app.kind === 'custom'
      ? [
          {
            key: 'removeCustom',
            label: t('miniapp.sidebar.remove_custom.title'),
            danger: true,
            onClick: async () => {
              try {
                await removeCustomMiniApp(app.appId)
                window.toast.success(t('settings.miniapps.custom.remove_success'))
              } catch (error) {
                window.toast.error(t('settings.miniapps.custom.remove_error'))
                logger.error('Failed to remove custom mini app:', error as Error)
              }
            }
          }
        ]
      : [])
  ]

  if (!shouldShow) {
    return null
  }

  return (
    <MiniAppContextMenu items={menuItems}>
      <button
        type="button"
        className="group flex w-[104px] flex-col items-center gap-2 rounded-[24px] px-2 py-2 text-center transition hover:bg-[var(--color-accent)]/70"
        onClick={handleClick}>
        <span
          className={cn(
            'relative flex items-center justify-center rounded-[26px] border border-transparent p-1.5 transition duration-200 group-hover:border-[var(--color-border)] group-hover:bg-[var(--color-card)]',
            isActive && 'border-[var(--color-border)] bg-[var(--color-card)] shadow-xs'
          )}>
          <MiniAppIcon size={size} app={app} />
          {isOpened && (
            <span className="absolute right-0 bottom-0 rounded-full bg-[var(--color-background)] p-[3px]">
              <IndicatorLight color="#22c55e" size={6} animation={!isActive} />
            </span>
          )}
        </span>
        <span className="w-full max-w-[88px] text-[12px] leading-4 text-[var(--color-text-3)] transition group-hover:text-[var(--color-text-1)]">
          <MarqueeText className="w-full overflow-hidden text-center">{displayName}</MarqueeText>
        </span>
      </button>
    </MiniAppContextMenu>
  )
}

export default MiniApp
