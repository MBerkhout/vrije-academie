import type { ExecArgs } from "@medusajs/framework/types"

import { sfRequest } from "../modules/salesforce-sync/client/rest"
import SalesforceSyncModuleService from "../modules/salesforce-sync/service"

type Describe = { fields: Array<{ name: string; type: string; createable: boolean; referenceTo?: string[] }> }

export default async function diagnose({ container }: ExecArgs) {
  const sync = container.resolve("salesforceSync") as InstanceType<typeof SalesforceSyncModuleService>
  const out = (s: string) => console.log(s)

  const oi = (await sfRequest<Describe>("GET", "/sobjects/OrderItem/describe")).data
  out("== OrderItem fields matching /gift|voucher|benef|type/i ==")
  for (const f of oi.fields.filter((f) => /gift|voucher|benef|type/i.test(f.name)))
    out(`${f.name} ${f.type} createable=${f.createable}`)

  const va = (await sfRequest<Describe>("GET", "/sobjects/vaProduct__c/describe")).data
  out("== vaProduct__c lookup fields ==")
  for (const f of va.fields.filter((f) => f.type === "reference"))
    out(`${f.name} -> ${f.referenceTo?.join(",")}`)

  const names = va.fields.map((f) => f.name)
  const pick = names.filter((n) =>
    /location|teacher|docent|cost|Productgroup|Start|Status|Record/i.test(n)
  )
  const rec = await sync.query<Record<string, unknown>>(
    `SELECT Id, Name, ${pick.slice(0, 40).join(", ")} FROM vaProduct__c WHERE Id = 'a04Mz00000sHHrlIAG'`
  )
  out("== vaProduct a04Mz00000sHHrlIAG ==")
  out(JSON.stringify(rec.records[0], null, 2))

  const recent = await sync.query<Record<string, unknown>>(
    `SELECT Id, Name, CreatedDate, CreatedBy.Name FROM vaProduct__c ORDER BY CreatedDate DESC LIMIT 3`
  )
  out("== newest vaProducts ==")
  out(JSON.stringify(recent.records, null, 2))
}
