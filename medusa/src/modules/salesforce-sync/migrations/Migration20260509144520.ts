import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260509144520 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "salesforce_sync_state" drop constraint if exists "salesforce_sync_state_entity_type_medusa_id_unique";`);
    this.addSql(`create table if not exists "salesforce_sync_state" ("id" text not null, "entity_type" text not null, "medusa_id" text not null, "salesforce_id" text null, "last_pushed_at" timestamptz null, "last_pulled_at" timestamptz null, "last_status" text null, "last_error" text null, "failure_count" integer not null default 0, "next_retry_at" timestamptz null, "severity" text null, "last_alert_at_failure_bucket" integer null, "incoming_lock_until" timestamptz null, "mapping_version" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "salesforce_sync_state_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_salesforce_sync_state_deleted_at" ON "salesforce_sync_state" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_salesforce_sync_state_entity_type_medusa_id_unique" ON "salesforce_sync_state" ("entity_type", "medusa_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "salesforce_sync_state" cascade;`);
  }

}
