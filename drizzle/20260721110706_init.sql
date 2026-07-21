CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TYPE "app"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'paused');--> statement-breakpoint
CREATE TYPE "app"."visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "app"."webhook_provider" AS ENUM('razorpay', 'stripe', 'resend');--> statement-breakpoint
CREATE TABLE "app"."organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"website" text,
	"description" text,
	"tags" jsonb,
	"visibility" "app"."visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "app"."organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" varchar(200),
	"avatar_url" text,
	"razorpay_customer_id" varchar(100),
	"stripe_customer_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" varchar(50) NOT NULL,
	"status" "app"."subscription_status" DEFAULT 'trialing' NOT NULL,
	"provider" "app"."webhook_provider" NOT NULL,
	"provider_subscription_id" varchar(100),
	"provider_payment_id" varchar(100),
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_amount_cents_check" CHECK ("app"."subscriptions"."amount_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "app"."subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "app"."webhook_provider" NOT NULL,
	"event_id" varchar(200) NOT NULL,
	"event_type" varchar(100),
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb,
	CONSTRAINT "uniq_webhook_provider_event" UNIQUE("provider","event_id")
);
--> statement-breakpoint
ALTER TABLE "app"."organizations" ADD CONSTRAINT "organizations_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."profiles" ADD CONSTRAINT "profiles_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_organizations_owner_id" ON "app"."organizations" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_organizations_visibility" ON "app"."organizations" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_user_id" ON "app"."subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_provider_sub" ON "app"."subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status" ON "app"."subscriptions" USING btree ("status");--> statement-breakpoint
CREATE POLICY "orgs_select_owner" ON "app"."organizations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "owner_id");--> statement-breakpoint
CREATE POLICY "orgs_select_visibility" ON "app"."organizations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("app"."organizations"."visibility" = 'public');--> statement-breakpoint
CREATE POLICY "orgs_insert_owner" ON "app"."organizations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "owner_id");--> statement-breakpoint
CREATE POLICY "orgs_update_owner" ON "app"."organizations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "owner_id") WITH CHECK ((select auth.uid()) = "owner_id");--> statement-breakpoint
CREATE POLICY "orgs_delete_owner" ON "app"."organizations" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "owner_id");--> statement-breakpoint
CREATE POLICY "profiles_select_self" ON "app"."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = id);--> statement-breakpoint
CREATE POLICY "profiles_insert_self" ON "app"."profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = id);--> statement-breakpoint
CREATE POLICY "profiles_update_self" ON "app"."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);--> statement-breakpoint
CREATE POLICY "subs_select_self" ON "app"."subscriptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "user_id");