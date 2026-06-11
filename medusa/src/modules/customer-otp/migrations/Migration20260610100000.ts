import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "customer_otp_challenge" (
        "id" text not null,
        "email" text not null,
        "code_hash" text not null,
        "purpose" text not null,
        "expires_at" timestamptz not null,
        "attempts" integer not null default 0,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "customer_otp_challenge_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_otp_challenge_email_purpose" ON "customer_otp_challenge" ("email", "purpose") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_otp_challenge_expires_at" ON "customer_otp_challenge" ("expires_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_otp_challenge" cascade;`)
  }
}
