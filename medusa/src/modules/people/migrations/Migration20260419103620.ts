import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260419103620 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "docent" ("id" text not null, "slug" text not null, "name" text not null, "role" text null, "photo_url" text null, "bio" text null, "subject_tags" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "docent_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_docent_deleted_at" ON "docent" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "docent" cascade;`);
  }

}
