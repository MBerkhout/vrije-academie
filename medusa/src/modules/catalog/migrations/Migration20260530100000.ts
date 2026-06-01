import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260530100000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "catalog_city" ("id" text not null, "slug" text not null, "label" text not null, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "catalog_city_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_catalog_city_slug_unique" ON "catalog_city" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_city_deleted_at" ON "catalog_city" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "catalog_city" cascade;`);
  }

}
