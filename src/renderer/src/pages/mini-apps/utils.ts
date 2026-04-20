import type { MiniApp } from '@shared/data/types/miniApp'

export type CustomMiniAppIdError = 'conflicting_ids' | 'duplicate_ids'

export const filterMiniAppsByQuery = (apps: MiniApp[], query: string) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return apps
  }

  return apps.filter((app) => {
    const name = app.name.toLowerCase()
    const url = app.url.toLowerCase()

    return name.includes(normalizedQuery) || url.includes(normalizedQuery)
  })
}

export const getCustomMiniAppIdError = ({
  appId,
  presetIds,
  existingIds
}: {
  appId: string
  presetIds: Set<string>
  existingIds: Set<string>
}): CustomMiniAppIdError | null => {
  if (presetIds.has(appId)) {
    return 'conflicting_ids'
  }

  if (existingIds.has(appId)) {
    return 'duplicate_ids'
  }

  return null
}
