import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260709120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "customer_legacy_password" (
        "id" text not null,
        "customer_id" text not null,
        "password_hash" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "customer_legacy_password_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_legacy_password_customer_id" ON "customer_legacy_password" ("customer_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_legacy_password" cascade;`)
  }
}
