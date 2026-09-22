import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Max session seats from Salesforce; used for "Bijna vol" (30% remaining) without changing on checkout. */
export class Migration20260922180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "event_item" add column if not exists "capacity" integer not null default 0;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "event_item" drop column if exists "capacity";`)
  }
}
