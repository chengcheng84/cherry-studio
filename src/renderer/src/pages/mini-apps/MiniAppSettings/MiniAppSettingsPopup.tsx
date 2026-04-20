import { Drawer, DrawerContent } from '@cherrystudio/ui'
import { TopView } from '@renderer/components/TopView'
import type { FC } from 'react'
import { useEffect, useState } from 'react'

import MiniAppSettings from './MiniAppSettings'

interface Props {
  resolve: (data: any) => void
}

const PopupContainer: FC<Props> = ({ resolve }) => {
  const [open, setOpen] = useState(true)

  const handleClose = () => {
    setOpen(false)
  }

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => resolve({}), 200)
      return () => clearTimeout(timer)
    }

    return undefined
  }, [open, resolve])

  MiniAppSettingsPopup.hide = handleClose

  return (
    <Drawer open={open} direction="right" onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DrawerContent className="top-2 right-2 bottom-2 h-auto w-[400px] max-w-none rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-card)] p-0 shadow-2xl">
        <MiniAppSettings onClose={handleClose} />
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
