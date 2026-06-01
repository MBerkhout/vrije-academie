import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260420120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "gift_card" (
        "id" text not null,
        "code" text not null,
        "initial_value" integer not null,
        "balance" integer not null,
        "currency_code" text not null,
        "status" text not null default 'active',
        "recipient_name" text not null,
        "recipient_email" text not null,
        "sender_name" text null,
        "message" text null,
        "purchased_by_order_id" text null,
        "source_line_item_id" text null,
        "expires_at" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "gift_card_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_gift_card_code_unique" ON "gift_card" ("code") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_gift_card_status" ON "gift_card" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_gift_card_recipient_email" ON "gift_card" ("recipient_email") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_gift_card_purchased_order" ON "gift_card" ("purchased_by_order_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "gift_card_transaction" (
        "id" text not null,
        "gift_card_id" text not null,
        "cart_id" text null,
        "type" text not null,
        "amount" integer not null,
        "order_id" text null,
        "note" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "gift_card_transaction_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_gift_card_transaction_card" ON "gift_card_transaction" ("gift_card_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_gift_card_transaction_cart" ON "gift_card_transaction" ("cart_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_gift_card_transaction_order" ON "gift_card_transaction" ("order_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "gift_card_transaction" cascade;`)
    this.addSql(`drop table if exists "gift_card" cascade;`)
  }
}
