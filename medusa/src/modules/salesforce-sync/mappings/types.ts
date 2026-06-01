export type FieldMap<TMedusa, TSf extends Record<string, unknown>> = {
  /** Salesforce external-id field API name */
  externalIdField: string
  /** Fields to retrieve on pull */
  salesforceFieldsForPull: string[]
  toSalesforce: (m: TMedusa) => Partial<TSf>
  fromSalesforce: (sf: TSf) => Partial<TMedusa>
}

export type EntityMapping<
  TMedusa = unknown,
  TSf extends Record<string, unknown> = Record<string, unknown>,
> = {
  medusaEntity: "customer" | "order" | "product" | "variant"
  salesforceObject: string
  fields: FieldMap<TMedusa, TSf>
}
