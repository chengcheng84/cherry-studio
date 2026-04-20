import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@cherrystudio/ui'
import { TopView } from '@renderer/components/TopView'
import { X } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import MiniAppSettings from './MiniAppSettings'

interface Props {
  resolve: (data: any) => void
}

const PopupContainer: FC<Props> = ({ resolve }) => {
  const [open, setOpen] = useState(true)
  const { t } = useTranslation()

  const handleClose = () => {
    setOpen(false)
  }

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => resolve({}), 200)
      return () => clearTimeout(timer)
    }
  }, [open, resolve])

  MiniAppSettingsPopup.hide = handleClose

  return (
    <Drawer open={open} direction="right" onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DrawerContent className="right-0 h-full w-[min(760px,100vw)] max-w-none border-l border-[var(--color-border)] bg-[var(--color-background)] p-0">
        <DrawerHeader className="border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle className="text-base text-[var(--color-text-1)]">
                {t('settings.miniapps.display_title')}
              </DrawerTitle>
            </div>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-full text-[var(--color-text-3)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-text-1)]"
              onClick={handleClose}
              aria-label={t('common.close')}>
              <X className="size-4" />
            </button>
          </div>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          <MiniAppSettings />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

const TopViewKey = 'MiniAppSettingsPopup'

export default class MiniAppSettingsPopup {
  static topviewId = 0
  static hide() {
    TopView.hide(TopViewKey)
  }
  static show() {
    return new Promise<any>((resolve) => {
      TopView.show(
        <PopupContainer
          resolve={(value) => {
            resolve(value)
            TopView.hide(TopViewKey)
          }}
        />,
        TopViewKey
      )
    })
  }
}
