import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps } from "@medusajs/types"
import { Container } from "@medusajs/ui"

import { SalesforceEntityPanel } from "./lib/salesforce-entity-panel"

type Row = { id: string }

const CustomerSalesforceWidget = ({ data }: DetailWidgetProps<Row>) => {
  return (
    <Container className="p-0">
      <div className="px-6 py-4">
        <SalesforceEntityPanel apiSegment="customers" entityId={data.id} />
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({ zone: "customer.details.after" })
export default CustomerSalesforceWidget
