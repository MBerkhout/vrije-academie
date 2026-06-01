import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260419092650 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "event_group" ("id" text not null, "record_type" text check ("record_type" in ('collegereeks', 'lezing', 'excursie', 'studiedag')) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "event_group_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_event_group_deleted_at" ON "event_group" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "event_item" ("id" text not null, "delivery_type" text check ("delivery_type" in ('online', 'offline', 'pre_recorded')) not null, "available_quantity" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "event_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_event_item_deleted_at" ON "event_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "property" ("id" text not null, "key" text not null, "value" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "property_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_event_property_key" ON "property" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_event_property_value" ON "property" ("value") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_property_deleted_at" ON "property" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "event_group" cascade;`);

    this.addSql(`drop table if exists "event_item" cascade;`);

    this.addSql(`drop table if exists "property" cascade;`);
  }

}
