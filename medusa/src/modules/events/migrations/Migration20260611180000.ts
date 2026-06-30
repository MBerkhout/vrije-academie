import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Allow `record_type: vathuis` on event_group (VAthuis on-demand catalog). */
export class Migration20260611180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "event_group" drop constraint if exists "event_group_record_type_check";`
    )
    this.addSql(
      `alter table if exists "event_group" add constraint "event_group_record_type_check" check ("record_type" in ('collegereeks', 'lezing', 'excursie', 'studiedag', 'vathuis'));`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "event_group" drop constraint if exists "event_group_record_type_check";`
    )
    this.addSql(
      `alter table if exists "event_group" add constraint "event_group_record_type_check" check ("record_type" in ('collegereeks', 'lezing', 'excursie', 'studiedag'));`
    )
  }
}
