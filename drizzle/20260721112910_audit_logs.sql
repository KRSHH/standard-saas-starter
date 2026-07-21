CREATE TABLE "app"."audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(100),
	"organization_id" uuid,
	"request_id" varchar(100),
	"ip" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_actor_id" ON "app"."audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_resource" ON "app"."audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_audit_organization_id" ON "app"."audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_audit_created_at" ON "app"."audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE POLICY "audit_select_self" ON "app"."audit_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = actor_id);--> statement-breakpoint
-- Append-only: authenticated users may SELECT (RLS-scoped to their own rows
-- above). NO insert/update/delete grant — only the service_role (admin client)
-- writes audit records, bypassing RLS.
grant select on app.audit_logs to authenticated;
