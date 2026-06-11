import { authenticate, defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/customer/me/auth-status",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/auth/set-password",
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
  ],
})
