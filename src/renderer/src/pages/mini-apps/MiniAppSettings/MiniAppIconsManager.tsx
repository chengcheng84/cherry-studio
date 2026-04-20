import type { DraggableProvided, DroppableProvided, DropResult } from '@hello-pangea/dnd'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { LogoAvatar } from '@renderer/components/Icons'
import { useMiniApps } from '@renderer/hooks/useMiniApps'
import { getMiniAppsStatusLabel } from '@renderer/i18n/label'
import type { MiniApp } from '@shared/data/types/miniApp'
import { Eye, EyeOff } from 'lucide-react'
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
    const MoveIcon = listType === 'visible' ? EyeOff : Eye

    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className="group flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-[var(--color-accent)]/30">
        <LogoAvatar logo={app.logo} size={20} />
        <span
          className={
            listType === 'visible'
              ? 'truncate text-[10px] text-[var(--color-text-1)]'
              : 'truncate text-[10px] text-[var(--color-text-2)]/60'
          }>
          {name}
        </span>
        <button
          type="button"
          className="ml-auto flex items-center justify-center text-[var(--color-text-3)]/0 transition group-hover:text-[var(--color-text-3)]/60"
          onClick={() => onMoveMiniApp(app, listType)}
          aria-label={name}>
          <MoveIcon className="size-3" />
        </button>
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {(['visible', 'disabled'] as const).map((listType) => (
          <div
            key={listType}
            className={
              listType === 'visible'
                ? 'flex min-w-0 flex-1 flex-col border-r border-[var(--color-border)]/10'
                : 'flex min-w-0 flex-1 flex-col'
            }>
            <div className="flex items-center justify-between px-3 py-2">
              <h4 className="text-[10px] text-[var(--color-text-3)]/70">{getMiniAppsStatusLabel(listType)}</h4>
              <span className="text-[9px] text-[var(--color-text-3)]/35">
                {(listType === 'visible' ? visibleMiniApps : disabledMiniApps).length}
              </span>
            </div>

            <Droppable droppableId={listType}>
              {(provided: DroppableProvided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex min-h-0 flex-1 flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden">
                  {(listType === 'visible' ? visibleMiniApps : disabledMiniApps).map((app, index) => (
                    <Draggable key={app.appId} draggableId={String(app.appId)} index={index}>
                      {(draggableProvided: DraggableProvided) => renderMiniAppItem(app, draggableProvided, listType)}
                    </Draggable>
                  ))}

                  {disabledMiniApps.length === 0 && listType === 'disabled' && (
                    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
                      <EyeOff className="mb-1 size-3.5 text-[var(--color-text-3)]/15" />
                      <span className="text-[9px] text-[var(--color-text-3)]/35">{t('settings.miniapps.empty')}</span>
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
