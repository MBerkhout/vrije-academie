import type { SubscriberArgs } from "@medusajs/framework/subscribers"

import { captureWithContext } from "./sentry"

export function sentrySubscriber<T extends Record<string, unknown>>(
  name: string,
  handler: (args: SubscriberArgs<T>) => Promise<void>
): (args: SubscriberArgs<T>) => Promise<void> {
  return async (args) => {
    try {
      await handler(args)
    } catch (error) {
      captureWithContext(error, {
        tags: { kind: "subscriber", subscriber: name },
      })
      throw error
    }
  }
}
