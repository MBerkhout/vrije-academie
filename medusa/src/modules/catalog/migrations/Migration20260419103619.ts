import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260419103619 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "catalog_category" ("id" text not null, "slug" text not null, "label" text not null, "sort_order" integer not null default 0, "image_url" text null, "color" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "catalog_category_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_category_deleted_at" ON "catalog_category" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "catalog_category" cascade;`);
  }

}
