import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260419103621 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "event_item" add column if not exists "start_at" timestamptz null, add column if not exists "end_at" timestamptz null, add column if not exists "city" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "event_item" drop column if exists "start_at", drop column if exists "end_at", drop column if exists "city";`);
  }

}
