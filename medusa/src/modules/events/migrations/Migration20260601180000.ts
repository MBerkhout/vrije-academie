import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260601180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "event_item" add column if not exists "instructor_name" text null;`
    )
    this.addSql(
      `alter table if exists "event_item" add column if not exists "instructor_salesforce_id" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "event_item" drop column if exists "instructor_salesforce_id";`)
    this.addSql(`alter table if exists "event_item" drop column if exists "instructor_name";`)
  }
}
