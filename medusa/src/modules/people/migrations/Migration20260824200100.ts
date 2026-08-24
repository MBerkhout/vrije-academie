import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260824200100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "docent" add column if not exists "is_active" boolean not null default true;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "docent" drop column if exists "is_active";`)
  }
}
