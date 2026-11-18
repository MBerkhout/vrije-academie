import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** `B25__Reservation__c` rows per event item + WebinarGeek URLs on event_item. */
export class Migration20261118120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "event_item_date" (
        "id" text not null,
        "event_item_id" text not null,
        "salesforce_id" text not null,
        "start_at" timestamptz null,
        "end_at" timestamptz null,
        "title" text null,
        "sequence" integer null,
        "session_type" text null,
        "location_name" text null,
        "room_name" text null,
        "address" text null,
        "instructor_name" text null,
        "instructor_salesforce_id" text null,
        "is_substitute" boolean not null default false,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "event_item_date_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_event_item_date_salesforce_id" ON "event_item_date" ("salesforce_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_event_item_date_event_item_id" ON "event_item_date" ("event_item_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_event_item_date_deleted_at" ON "event_item_date" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `alter table if exists "event_item" add column if not exists "live_url" text null;`
    )
    this.addSql(
      `alter table if exists "event_item" add column if not exists "recording_url" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "event_item" drop column if exists "recording_url";`)
    this.addSql(`alter table if exists "event_item" drop column if exists "live_url";`)
    this.addSql(`drop table if exists "event_item_date" cascade;`)
  }
}