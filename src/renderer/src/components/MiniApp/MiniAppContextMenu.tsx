import { cn } from '@renderer/utils'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export interface MiniAppContextMenuItem {
  key: string
  label: string
  danger?: boolean
  onClick: () => void | Promise<void>
}

interface MiniAppContextMenuProps {
  items: MiniAppContextMenuItem[]
  children: ReactNode
}

const CONTEXT_MENU_BACKDROP_Z = 10049
const CONTEXT_MENU_PANEL_Z = 10050
const CONTEXT_MENU_WIDTH = 170
const CONTEXT_MENU_ITEM_HEIGHT = 40

const MiniAppContextMenu = ({ items, children }: MiniAppContextMenuProps) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!position) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPosition(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [position])

  return (
    <>
      <div
        onContextMenu={(event) => {
          event.preventDefault()
          const maxX = Math.max(8, window.innerWidth - CONTEXT_MENU_WIDTH - 8)
          const maxY = Math.max(8, window.innerHeight - items.length * CONTEXT_MENU_ITEM_HEIGHT - 8)

          setPosition({
            x: Math.min(event.clientX, maxX),
            y: Math.min(event.clientY, maxY)
          })
        }}>
        {children}
      </div>

      {position &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              role="presentation"
              className="fixed inset-0 [-webkit-app-region:no-drag]"
              style={{ zIndex: CONTEXT_MENU_BACKDROP_Z }}
              onPointerDown={(event) => {
                if (event.button !== 0 && event.button !== 2) {
                  return
                }
                event.preventDefault()
                setPosition(null)
              }}
            />
            <div
              className="fixed min-w-[150px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-popover)] p-1 shadow-xl [-webkit-app-region:no-drag]"
              style={{ left: position.x, top: position.y, zIndex: CONTEXT_MENU_PANEL_Z }}
              onPointerDown={(event) => event.stopPropagation()}>
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={cn(
                    'flex w-full items-center rounded-[8px] px-3 py-2 text-left text-sm transition hover:bg-[var(--color-accent)]',
                    item.danger ? 'text-[var(--color-destructive)]' : 'text-[var(--color-text-1)]'
                  )}
                  onClick={() => {
                    void item.onClick()
                    setPosition(null)
                  }}>
                  {item.label}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  )
}

export default MiniAppContextMenu
