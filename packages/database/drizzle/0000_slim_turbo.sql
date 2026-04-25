CREATE TYPE "public"."content_category" AS ENUM('image', 'video', 'music');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('instagram', 'tiktok', 'youtube', 'spotify', 'soundcloud');--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subdomain" varchar(63) NOT NULL,
	"custom_domain" varchar(253),
	"theme_id" uuid NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"modified_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"category" "content_category" NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"title" text,
	"description" text,
	"metadata" jsonb,
	"published_at" timestamp,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"modified_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "social_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"modified_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"modified_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artists_subdomain_idx" ON "artists" USING btree ("subdomain") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "artists_custom_domain_idx" ON "artists" USING btree ("custom_domain") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "content_artist_provider_external_idx" ON "content" USING btree ("artist_id","provider","external_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "social_connections_artist_provider_idx" ON "social_connections" USING btree ("artist_id","provider") WHERE deleted_at IS NULL;