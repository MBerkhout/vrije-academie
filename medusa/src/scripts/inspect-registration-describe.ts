/**
 * One-off: describe Registration__c Status__c and Order__c fields.
 *   npx medusa exec ./src/scripts/inspect-registration-describe.ts
 */
import { sfRequest } from "../modules/salesforce-sync/client/rest"
import { SF_REGISTRATION_OBJECT } from "../modules/salesforce-sync/mappings/registration"
import { salesforceAuthMode } from "../modules/salesforce-sync/utils/is-configured"

export default async function inspectRegistrationDescribe() {
  const mode = salesforceAuthMode()
  if (!mode) {
    console.log("[inspect-registration] Salesforce not configured — skip describe")
    return
  }

  const { data } = await sfRequest<{
    fields?: Array<{
      name: string
      label: string
      type: string
      nillable?: boolean
      createable?: boolean
      picklistValues?: Array<{ value: string; label: string; active: boolean }>
    }>
  }>("GET", `/sobjects/${SF_REGISTRATION_OBJECT}/describe`)

  const fields = data.fields ?? []
  const status = fields.find((f) => f.name === "Status__c")
  const order = fields.find((f) => f.name === "Order__c")

  console.log("Status__c:", JSON.stringify(status, null, 2))
  console.log("Order__c required (nillable=false):", order ? !order.nillable : "field not found")
}
