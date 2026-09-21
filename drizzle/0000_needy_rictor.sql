CREATE TABLE "comments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" text NOT NULL,
	"itinerary_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"photo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "votes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"participant_id" text NOT NULL,
	"itinerary_id" text NOT NULL,
	"choice" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "vote_once" ON "votes" USING btree ("participant_id","itinerary_id");