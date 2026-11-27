import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261127090000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_analytics_daily" ("id" text not null, "product_handle" text not null, "date" text not null, "views" integer not null default 0, "unique_users" integer not null default 0, "add_to_cart" integer not null default 0, "list_clicks" integer not null default 0, "avg_list_position" real null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_analytics_daily_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_analytics_daily_deleted_at" ON "product_analytics_daily" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_analytics_daily_product_handle_date_unique" ON "product_analytics_daily" ("product_handle", "date") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_analytics_daily_date" ON "product_analytics_daily" ("date") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_list_click_daily" ("id" text not null, "product_handle" text not null, "date" text not null, "item_list_id" text not null default '', "position" integer not null default 0, "clicks" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_list_click_daily_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_list_click_daily_deleted_at" ON "product_list_click_daily" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_list_click_daily_key_unique" ON "product_list_click_daily" ("product_handle", "date", "item_list_id", "position") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_list_click_daily_date" ON "product_list_click_daily" ("date") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_analytics_daily" cascade;`);
    this.addSql(`drop table if exists "product_list_click_daily" cascade;`);
  }

}
