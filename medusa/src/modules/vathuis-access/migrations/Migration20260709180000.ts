import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260709180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "customer_vathuis_access" (
        "id" text not null,
        "customer_id" text not null,
        "product_id" text not null,
        "product_handle" text not null,
        "product_title" text null,
        "variant_id" text not null,
        "order_id" text not null,
        "order_line_item_id" text not null,
        "granted_at" text not null,
        "expires_at" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "customer_vathuis_access_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_vathuis_access_customer_product" ON "customer_vathuis_access" ("customer_id", "product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_vathuis_access_customer_expires" ON "customer_vathuis_access" ("customer_id", "expires_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_vathuis_access_order_line" ON "customer_vathuis_access" ("order_id", "order_line_item_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_vathuis_access" cascade;`)
  }
}
