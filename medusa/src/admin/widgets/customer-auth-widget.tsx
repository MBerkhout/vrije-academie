import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps } from "@medusajs/types"
import { Container } from "@medusajs/ui"

import { CustomerAuthPanel } from "./lib/customer-auth-panel"

type Row = { id: string }

const CustomerAuthWidget = ({ data }: DetailWidgetProps<Row>) => {
  return (
    <Container className="p-0">
      <div className="px-6 py-4">
        <CustomerAuthPanel customerId={data.id} />
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "customer.details.after" })
export default CustomerAuthWidget
