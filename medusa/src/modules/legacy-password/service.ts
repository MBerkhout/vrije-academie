import { MedusaService } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import { CustomerLegacyPassword } from "./models/customer-legacy-password"

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

type MedusaContainer = {
  resolve: (key: string) => unknown
}

class LegacyPasswordModuleService extends MedusaService({
  CustomerLegacyPassword,
}) {
  async getByCustomerId(customerId: string) {
    const rows = await this.listCustomerLegacyPasswords(
      { customer_id: customerId },
      { take: 1 }
    )
    return rows[0] ?? null
  }

  async getByEmail(container: MedusaContainer, email: string) {
    const normalized = normalizeEmail(email)
    const customerService = container.resolve(Modules.CUSTOMER) as ICustomerModuleService
    const [customers] = await customerService.listAndCountCustomers(
      { email: normalized },
      { take: 1, select: ["id"] }
    )
    const customer = customers[0]
    if (!customer) return null
    return this.getByCustomerId(customer.id)
  }

  async hasLegacyPassword(container: MedusaContainer, email: string): Promise<boolean> {
    const row = await this.getByEmail(container, email)
    return row !== null && typeof row.password_hash === "string" && row.password_hash.length > 0
  }

  async set(customerId: string, passwordHash: string): Promise<void> {
    const existing = await this.getByCustomerId(customerId)
    if (existing) {
      await this.updateCustomerLegacyPasswords({
        id: existing.id,
        password_hash: passwordHash,
      })
      return
    }
    await this.createCustomerLegacyPasswords({
      customer_id: customerId,
      password_hash: passwordHash,
    })
  }

  async deleteByCustomerId(customerId: string): Promise<void> {
    const existing = await this.getByCustomerId(customerId)
    if (existing) {
      await this.deleteCustomerLegacyPasswords(existing.id)
    }
  }
}

export default LegacyPasswordModuleService
