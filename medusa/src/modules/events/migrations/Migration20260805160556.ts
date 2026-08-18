import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260805160556 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "event_group" drop constraint if exists "event_group_record_type_check";`);

    this.addSql(`alter table if exists "event_group" add column if not exists "show_in_plp" boolean not null default true;`);
    this.addSql(`alter table if exists "event_group" add constraint "event_group_record_type_check" check("record_type" in ('collegereeks', 'lezing', 'excursie', 'studiedag', 'vathuis'));`);

    this.addSql(`alter table if exists "event_item" add column if not exists "city_slug" text null, add column if not exists "location_name" text null, add column if not exists "catalog_city_id" text null, add column if not exists "catalog_location_id" text null, add column if not exists "docent_id" text null, add column if not exists "instructor_name" text null, add column if not exists "instructor_salesforce_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "event_group" drop constraint if exists "event_group_record_type_check";`);

    this.addSql(`alter table if exists "event_group" drop column if exists "show_in_plp";`);

    this.addSql(`alter table if exists "event_group" add constraint "event_group_record_type_check" check("record_type" in ('collegereeks', 'lezing', 'excursie', 'studiedag'));`);

    this.addSql(`alter table if exists "event_item" drop column if exists "city_slug", drop column if exists "location_name", drop column if exists "catalog_city_id", drop column if exists "catalog_location_id", drop column if exists "docent_id", drop column if exists "instructor_name", drop column if exists "instructor_salesforce_id";`);
  }

}
