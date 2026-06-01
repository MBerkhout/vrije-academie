export const SF_ENTITY = {
  customer: "customer",
  order: "order",
  product: "product",
  variant: "variant",
} as const

export type SalesforceEntityType = (typeof SF_ENTITY)[keyof typeof SF_ENTITY]
