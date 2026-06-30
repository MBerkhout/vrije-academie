import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260612140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "salesforce_sync_state" add column if not exists "salesforce_account_id" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "salesforce_sync_state" drop column if exists "salesforce_account_id";`
    )
  }
}
