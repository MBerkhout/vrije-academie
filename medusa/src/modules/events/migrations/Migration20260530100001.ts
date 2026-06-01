import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260530100001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "event_item" add column if not exists "city_slug" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "event_item" drop column if exists "city_slug";`);
  }

}
