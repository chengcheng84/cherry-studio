import { Button, Input, Scrollbar } from '@cherrystudio/ui'
import { Navbar, NavbarMain } from '@renderer/components/app/Navbar'
import MiniApp from '@renderer/components/MiniApp/MiniApp'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { useNavbarPosition } from '@renderer/hooks/useNavbar'
import { cn } from '@renderer/utils'
import { Search, Settings2 } from 'lucide-react'
import type { FC } from 'react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import MiniAppSettingsPopup from './MiniAppSettings/MiniAppSettingsPopup'
import NewAppButton from './NewAppButton'
import { filterMiniAppsByQuery } from './utils'

const MiniAppsToolbar = ({
  search,
  onSearchChange,
  onOpenSettings,
  className,
  controlClassName
}: {
  search: string
  onSearchChange: (value: string) => void
  onOpenSettings: () => void
  className?: string
  controlClassName?: string
}) => {
  const { t } = useTranslation()

  return (
    <div className={cn('flex w-full items-center gap-3', className)}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold tracking-tight text-[var(--color-text-1)]">
          {t('miniapp.title')}
        </div>
      </div>
      <div className="flex w-full max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--color-text-3)]" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('common.search')}
            className={cn(
              'h-10 rounded-full border-transparent bg-[var(--color-background-soft)] pr-3 pl-9 text-sm shadow-none focus-visible:border-[var(--color-border)] focus-visible:ring-0',
              controlClassName
            )}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-10 w-10 shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-2)] hover:bg-[var(--color-accent)] hover:text-[var(--color-text-1)]',
            controlClassName
          )}
          onClick={onOpenSettings}
          aria-label={t('settings.miniapps.display_title')}>
          <Settings2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

const MiniAppsPage: FC = () => {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const { miniapps } = useMiniApps()
  const { isTopNavbar } = useNavbarPosition()

  const filteredApps = useMemo(() => filterMiniAppsByQuery(miniapps, deferredSearch), [deferredSearch, miniapps])

  const toolbar = (
    <MiniAppsToolbar
      search={search}
      onSearchChange={setSearch}
      onOpenSettings={MiniAppSettingsPopup.show}
      controlClassName={isTopNavbar ? undefined : 'nodrag'}
    />
  )

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-[var(--color-background)]">
      <Navbar>
        <NavbarMain>{toolbar}</NavbarMain>
      </Navbar>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 md:px-6">
        {isTopNavbar && <div className="py-3">{toolbar}</div>}

        <div className="flex min-h-0 flex-1 overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[linear-gradient(180deg,var(--color-card)_0%,var(--color-background)_100%)] shadow-[0_24px_60px_-36px_rgba(0,0,0,0.45)]">
          <Scrollbar className="min-h-0 flex-1 px-4 py-5 md:px-6 md:py-6">
            <div className="mx-auto grid max-w-[1120px] grid-cols-[repeat(auto-fill,minmax(104px,1fr))] justify-items-center gap-x-3 gap-y-6 md:gap-x-5 md:gap-y-8">
              {filteredApps.map((app) => (
                <MiniApp key={app.appId} app={app} />
              ))}
              <NewAppButton />
            </div>
          </Scrollbar>
        </div>
      </div>
    </div>
  )
}

export default MiniAppsPage
