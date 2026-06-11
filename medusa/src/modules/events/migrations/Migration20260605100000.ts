import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260605100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "event_item" add column if not exists "location_name" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "event_item" drop column if exists "location_name";`)
  }
}
