import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260419120311 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "event_group" add column if not exists "has_free_trial" boolean not null default false;`);

    this.addSql(`alter table if exists "event_item" add column if not exists "registration_deadline_at" timestamptz null, add column if not exists "is_free_trial" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "event_group" drop column if exists "has_free_trial";`);

    this.addSql(`alter table if exists "event_item" drop column if exists "registration_deadline_at", drop column if exists "is_free_trial";`);
  }

}
