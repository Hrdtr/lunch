import { hapticFeedback } from '@telegram-apps/sdk'

function noop() {}

export const haptic = {
  impact: hapticFeedback.isSupported() ? hapticFeedback.impactOccurred : noop,
  notification: hapticFeedback.isSupported() ? hapticFeedback.notificationOccurred : noop,
  selectionChanged: hapticFeedback.isSupported() ? hapticFeedback.selectionChanged : noop,
}
