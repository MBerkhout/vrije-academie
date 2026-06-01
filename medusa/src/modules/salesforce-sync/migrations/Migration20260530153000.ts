import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260530153000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "salesforce_oauth_settings" ("id" text not null, "refresh_token" text null, "instance_url" text null, "connected_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "salesforce_oauth_settings_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_salesforce_oauth_settings_deleted_at" ON "salesforce_oauth_settings" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "salesforce_oauth_settings" cascade;`)
  }
}
