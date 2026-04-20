import { Input } from '@cherrystudio/ui'
import { Navbar, NavbarMain } from '@renderer/components/app/Navbar'
import MiniApp from '@renderer/components/MiniApp/MiniApp'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { useNavbarPosition } from '@renderer/hooks/useNavbar'
import { cn } from '@renderer/utils'
import { Plus, Puzzle, Search, Settings2, X } from 'lucide-react'
import type { FC } from 'react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import MiniAppSettings from './MiniAppSettings/MiniAppSettings'
import NewAppButton, { MiniAppCreatePanel } from './NewAppButton'
import { filterMiniAppsByQuery } from './utils'

const MiniAppsToolbar = ({
  search,
  onSearchChange,
  onOpenSettings,
  onOpenCreate,
  className,
  controlClassName
}: {
  search: string
  onSearchChange: (value: string) => void
  onOpenSettings: () => void
  onOpenCreate: () => void
  className?: string
  controlClassName?: string
}) => {
  const { t } = useTranslation()

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs">
          <Puzzle className="size-[13px] text-[var(--color-text-3)]" />
          <span className="text-[13px] text-[var(--color-text-1)]">{t('miniapp.title')}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn(
              'flex size-7 items-center justify-center rounded-md text-[var(--color-text-3)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-text-1)]',
              controlClassName
            )}
            onClick={onOpenCreate}
            aria-label={t('settings.miniapps.custom.title')}>
            <Plus className="size-[14px]" />
          </button>
          <button
            type="button"
            className={cn(
              'flex size-7 items-center justify-center rounded-md text-[var(--color-text-3)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-text-1)]',
              controlClassName
            )}
            onClick={onOpenSettings}
            aria-label={t('settings.miniapps.display_title')}>
            <Settings2 className="size-[14px]" />
          </button>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-md">
        <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-[13px] text-[var(--color-text-3)]/40" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('common.search')}
          className={cn(
            'h-8 rounded-lg border-[var(--color-border)]/50 bg-[var(--color-background)]/40 pr-8 pl-8 text-xs shadow-none placeholder:text-[var(--color-text-3)]/30 focus-visible:border-[var(--color-border)]/70 focus-visible:ring-0',
            controlClassName
          )}
        />
        {search && (
          <button
            type="button"
            className="-translate-y-1/2 absolute top-1/2 right-2 text-[var(--color-text-3)]/50 transition hover:text-[var(--color-text-1)]"
            onClick={() => onSearchChange('')}
            aria-label={t('common.clear')}>
            <X className="size-3" />
          </button>
        )}
      </div>
    </div>
  )
}

const MiniAppsPage: FC = () => {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false)
  const deferredSearch = useDeferredValue(search)
  const { miniapps } = useMiniApps()
  const { isTopNavbar } = useNavbarPosition()

  const filteredApps = useMemo(() => filterMiniAppsByQuery(miniapps, deferredSearch), [deferredSearch, miniapps])

  const openCreateDrawer = () => {
    setShowSettingsDrawer(false)
    setShowCreateDrawer(true)
  }

  const openSettingsDrawer = () => {
    setShowCreateDrawer(false)
    setShowSettingsDrawer(true)
  }

  const closePanels = () => {
    setShowCreateDrawer(false)
    setShowSettingsDrawer(false)
  }

  const toolbar = (
    <MiniAppsToolbar
      search={search}
      onSearchChange={setSearch}
      onOpenSettings={openSettingsDrawer}
      onOpenCreate={openCreateDrawer}
      controlClassName={isTopNavbar ? undefined : 'nodrag'}
    />
  )

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-background">
      <Navbar>
        <NavbarMain>{toolbar}</NavbarMain>
      </Navbar>

      <div className="flex min-h-0 flex-1 flex-col px-6 py-2">
        {isTopNavbar && <div className="pb-3">{toolbar}</div>}

        <div className="flex min-h-0 flex-1 overflow-y-auto px-1 py-2 [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto flex w-full max-w-5xl flex-col">
            <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {filteredApps.map((app) => (
                <MiniApp key={app.appId} app={app} />
              ))}
              <NewAppButton compact onClick={openCreateDrawer} />
            </div>
          </div>
        </div>
      </div>

      {(showCreateDrawer || showSettingsDrawer) && (
        <button
          type="button"
          aria-label={t('common.close')}
          className="absolute inset-0 z-40 bg-black/20"
          onClick={closePanels}
        />
      )}

      {showCreateDrawer && <MiniAppCreatePanel onClose={() => setShowCreateDrawer(false)} />}

      {showSettingsDrawer && (
        <section className="absolute top-2 right-2 bottom-2 z-50 flex w-[400px] flex-col overflow-hidden rounded-[8px] border border-border/30 bg-card shadow-2xl">
          <MiniAppSettings onClose={() => setShowSettingsDrawer(false)} />
        </section>
      )}
    </div>
  )
}

export default MiniAppsPage
