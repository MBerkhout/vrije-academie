import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder, DetailWidgetProps } from "@medusajs/types"
import { Container } from "@medusajs/ui"

import { SalesforceEntityPanel } from "./lib/salesforce-entity-panel"

const OrderSalesforceWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  return (
    <Container className="p-0">
      <div className="px-6 py-4">
        <SalesforceEntityPanel apiSegment="orders" entityId={data.id} />
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "order.details.after" })
export default OrderSalesforceWidget
