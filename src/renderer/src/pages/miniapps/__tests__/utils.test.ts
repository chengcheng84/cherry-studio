import type { MiniApp } from '@shared/data/types/miniapp'
import { describe, expect, it } from 'vitest'

import { filterMiniAppsByQuery, getCustomMiniAppIdError } from '../utils'

const createMiniApp = (overrides: Partial<MiniApp>): MiniApp =>
  ({
    appId: overrides.appId ?? 'app-id',
    name: overrides.name ?? 'Cherry Search',
    url: overrides.url ?? 'https://search.example.com',
    status: overrides.status ?? 'enabled',
    sortOrder: overrides.sortOrder ?? 0,
    type: overrides.type ?? 'builtin'
  }) as MiniApp

describe('miniapps utils', () => {
  it('filters miniapps by name and url with trimmed query text', () => {
    const apps = [
      createMiniApp({ appId: 'search', name: 'Cherry Search', url: 'https://search.example.com' }),
      createMiniApp({ appId: 'docs', name: 'Docs', url: 'https://docs.example.com' })
    ]

    expect(filterMiniAppsByQuery(apps, '  cherry  ')).toEqual([apps[0]])
    expect(filterMiniAppsByQuery(apps, 'docs.example')).toEqual([apps[1]])
    expect(filterMiniAppsByQuery(apps, '')).toEqual(apps)
  })

  it('detects preset and existing custom id conflicts', () => {
    expect(
      getCustomMiniAppIdError({
        appId: 'builtin-app',
        presetIds: new Set(['builtin-app']),
        existingIds: new Set(['my-app'])
      })
    ).toBe('conflicting_ids')

    expect(
      getCustomMiniAppIdError({
        appId: 'my-app',
        presetIds: new Set(['builtin-app']),
        existingIds: new Set(['my-app'])
      })
    ).toBe('duplicate_ids')

    expect(
      getCustomMiniAppIdError({
        appId: 'fresh-app',
        presetIds: new Set(['builtin-app']),
        existingIds: new Set(['my-app'])
      })
    ).toBeNull()
  })
})
