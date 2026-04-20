import type { DraggableProvided, DroppableProvided, DropResult } from '@hello-pangea/dnd'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { LogoAvatar } from '@renderer/components/Icons'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { getMiniAppsStatusLabel } from '@renderer/i18n/label'
import { cn } from '@renderer/utils'
import type { MiniApp } from '@shared/data/types/miniApp'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import type { FC } from 'react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface MiniAppManagerProps {
  visibleMiniApps: MiniApp[]
  disabledMiniApps: MiniApp[]
  setVisibleMiniApps: (programs: MiniApp[]) => void
  setDisabledMiniApps: (programs: MiniApp[]) => void
}

type ListType = 'visible' | 'disabled'

const MiniAppIconsManager: FC<MiniAppManagerProps> = ({
  visibleMiniApps,
  disabledMiniApps,
  setVisibleMiniApps,
  setDisabledMiniApps
}) => {
  const { t } = useTranslation()
  const { pinned, updateMiniApps, updateDisabledMiniApps, updatePinnedMiniApps } = useMiniApps()

  const handleListUpdate = useCallback(
    (newVisible: MiniApp[], newDisabled: MiniApp[]) => {
      setVisibleMiniApps(newVisible)
      setDisabledMiniApps(newDisabled)
      void updateMiniApps(newVisible)
      void updateDisabledMiniApps(newDisabled)
      const disabledIds = new Set(newDisabled.map((app) => app.appId))
      void updatePinnedMiniApps(pinned.filter((app) => !disabledIds.has(app.appId)))
    },
    [pinned, setDisabledMiniApps, setVisibleMiniApps, updateDisabledMiniApps, updateMiniApps, updatePinnedMiniApps]
  )

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) {
        return
      }

      const { source, destination } = result

      if (source.droppableId === destination.droppableId) {
        const list = source.droppableId === 'visible' ? [...visibleMiniApps] : [...disabledMiniApps]
        const [removed] = list.splice(source.index, 1)
        list.splice(destination.index, 0, removed)

        if (source.droppableId === 'visible') {
          handleListUpdate(list, disabledMiniApps)
        } else {
          handleListUpdate(visibleMiniApps, list)
        }
        return
      }

      const sourceList = source.droppableId === 'visible' ? [...visibleMiniApps] : [...disabledMiniApps]
      const destList = destination.droppableId === 'visible' ? [...visibleMiniApps] : [...disabledMiniApps]

      const [removed] = sourceList.splice(source.index, 1)
      const targetList = destList.filter((app) => app.appId !== removed.appId)
      targetList.splice(destination.index, 0, removed)

      const newVisibleMiniApps = destination.droppableId === 'visible' ? targetList : sourceList
      const newDisabledMiniApps = destination.droppableId === 'disabled' ? targetList : sourceList

      handleListUpdate(newVisibleMiniApps, newDisabledMiniApps)
    },
    [visibleMiniApps, disabledMiniApps, handleListUpdate]
  )

  const onMoveMiniApp = useCallback(
    (app: MiniApp, fromList: ListType) => {
      const isMovingToVisible = fromList === 'disabled'
      const newVisible = isMovingToVisible
        ? [...visibleMiniApps, app]
        : visibleMiniApps.filter((item) => item.appId !== app.appId)
      const newDisabled = isMovingToVisible
        ? disabledMiniApps.filter((item) => item.appId !== app.appId)
        : [...disabledMiniApps, app]

      handleListUpdate(newVisible, newDisabled)
    },
    [visibleMiniApps, disabledMiniApps, handleListUpdate]
  )

  const renderMiniAppItem = (app: MiniApp, provided: DraggableProvided, listType: ListType) => {
    const name = app.nameKey ? t(app.nameKey) : app.name
    const MoveIcon = listType === 'visible' ? ChevronRight : ChevronLeft

    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className="group flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.4)] transition hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-accent)]/40">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-[var(--color-text-3)]">
            <GripVertical className="size-4" />
          </span>
          <LogoAvatar logo={app.logo} size={16} />
          <span className="truncate text-sm text-[var(--color-text-1)]">{name}</span>
        </div>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full text-[var(--color-text-3)] opacity-0 transition hover:bg-[var(--color-accent)] hover:text-[var(--color-text-1)] group-hover:opacity-100"
          onClick={() => onMoveMiniApp(app, listType)}
          aria-label={name}>
          <MoveIcon className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 lg:grid-cols-2">
        {(['visible', 'disabled'] as const).map((listType) => (
          <div
            key={listType}
            className="min-w-0 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-background-soft)]/70 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h4 className="text-sm font-medium text-[var(--color-text-1)]">{getMiniAppsStatusLabel(listType)}</h4>
              <span className="text-xs text-[var(--color-text-3)]">
                {(listType === 'visible' ? visibleMiniApps : disabledMiniApps).length}
              </span>
            </div>

            <Droppable droppableId={listType}>
              {(provided: DroppableProvided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'flex min-h-[320px] flex-col gap-2 rounded-[20px] border border-dashed border-[var(--color-border)] bg-[var(--color-background)] p-2',
                    listType === 'disabled' && disabledMiniApps.length === 0 && 'justify-center'
                  )}>
                  {(listType === 'visible' ? visibleMiniApps : disabledMiniApps).map((app, index) => (
                    <Draggable key={app.appId} draggableId={String(app.appId)} index={index}>
                      {(draggableProvided: DraggableProvided) => renderMiniAppItem(app, draggableProvided, listType)}
                    </Draggable>
                  ))}

                  {disabledMiniApps.length === 0 && listType === 'disabled' && (
                    <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-[var(--color-text-3)]">
                      {t('settings.miniapps.empty')}
                    </div>
                  )}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}

export default MiniAppIconsManager
