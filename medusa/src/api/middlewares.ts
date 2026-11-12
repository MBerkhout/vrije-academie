import { authenticate, defineMiddlewares } from "@medusajs/framework/http"

import { detachStaleCartCustomer } from "./middlewares/detach-stale-cart-customer"
import { medusaSentryErrorHandler } from "./middlewares/sentry-error-handler"
import { storeRequestTiming } from "./middlewares/store-request-timing"

export default defineMiddlewares({
  errorHandler: medusaSentryErrorHandler,
  routes: [
    {
      matcher: "/store/*",
      middlewares: [storeRequestTiming],
    },
    {
      matcher: "/store/events/*/waitlist",
      method: "POST",
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
      ],
    },
    {
      matcher: "/store/customer/me/auth-status",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customer/me/sync-from-salesforce",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customer/me/order-history-import",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customer/me/push-to-salesforce",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customer/me/vathuis-access",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customer/me/vathuis-access/:handle",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customer/me/vathuis-access/:handle/episodes/:episodeKey/embed",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/auth/set-password",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/carts/*",
      method: ["POST"],
      middlewares: [detachStaleCartCustomer],
    },
    {
      matcher: "/store/carts/sync",
      method: "POST",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/auth/otp/request",
      method: "POST",
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
      ],
    },
    {
      matcher: "/admin/events/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/catalog/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/people/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/sanity/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/salesforce/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
    {
      matcher: "/admin/customer-auth/*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
  ],
})
