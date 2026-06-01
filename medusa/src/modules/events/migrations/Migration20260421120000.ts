import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260421120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "event_group" add column if not exists "show_in_plp" boolean not null default true;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "event_group" drop column if exists "show_in_plp";`)
  }
}
