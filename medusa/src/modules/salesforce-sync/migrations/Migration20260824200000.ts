import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260824200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "salesforce_webhook_event" ("id" text not null, "object_type" text not null, "method" text not null, "salesforce_id" text not null, "entity_type" text null, "medusa_id" text null, "status" text not null default 'pending', "attempts" integer not null default 0, "error" text null, "received_at" timestamptz not null, "processed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "salesforce_webhook_event_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_salesforce_webhook_event_deleted_at" ON "salesforce_webhook_event" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_salesforce_webhook_event_status" ON "salesforce_webhook_event" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_salesforce_webhook_event_object_type_salesforce_id" ON "salesforce_webhook_event" ("object_type", "salesforce_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_salesforce_webhook_event_created_at" ON "salesforce_webhook_event" ("created_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "salesforce_webhook_event" cascade;`)
  }
}
