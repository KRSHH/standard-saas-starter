CREATE TYPE "app"."notification_channel" AS ENUM('in_app', 'email');--> statement-breakpoint
CREATE TYPE "app"."notification_level" AS ENUM('info', 'success', 'warning', 'error');--> statement-breakpoint
CREATE TABLE "app"."notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"email_categories" jsonb DEFAULT '["billing","security","system","invite"]'::jsonb NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"complained_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."notification_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" "app"."notification_channel" DEFAULT 'in_app' NOT NULL,
	"level" "app"."notification_level" DEFAULT 'info' NOT NULL,
	"category" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"url" text,
	"read_at" timestamp with time zone,
	"email_message_id" varchar(200),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "app"."notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "app"."notifications" USING btree ("user_id","read_at") WHERE "app"."notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX "idx_notifications_email_message_id" ON "app"."notifications" USING btree ("email_message_id") WHERE "app"."notifications"."email_message_id" is not null;--> statement-breakpoint
CREATE POLICY "notification_preferences_all_self" ON "app"."notification_preferences" AS PERMISSIVE FOR ALL TO "authenticated" USING ("app"."notification_preferences"."user_id" = (select auth.uid())) WITH CHECK ("app"."notification_preferences"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "notifications_select_self" ON "app"."notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "user_id");--> statement-breakpoint
CREATE POLICY "notifications_update_self" ON "app"."notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "user_id") WITH CHECK ((select auth.uid()) = "user_id");--> statement-breakpoint
-- Grants: clients can SELECT notifications + read their own preferences and
-- UPDATE both (read_at, preferences). Inserts are service-role only.
grant select, update on app.notifications, app.notification_preferences to authenticated;
--> statement-breakpoint
-- Reuse the shared set_updated_at trigger for preferences (mutable); notifications
-- are append-only so they don't need it.
drop trigger if exists trg_notification_preferences_updated_at on app.notification_preferences;
create trigger trg_notification_preferences_updated_at
  before update on app.notification_preferences
  for each row execute function app.set_updated_at();
