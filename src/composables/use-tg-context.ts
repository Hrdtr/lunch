import type { LaunchParams } from '@telegram-apps/sdk'

export const useTgContext = createSharedComposable(() => {
  const tg = inject<{
    launchParams: LaunchParams
  } | null>('telegram', null)

  return tg
})
