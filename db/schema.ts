import { integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const participants = pgTable("participants", { id: text("id").primaryKey(), name: text("name").notNull(), photo: text("photo"), createdAt: timestamp("created_at").defaultNow().notNull() });
export const votes = pgTable("votes", { id: integer("id").primaryKey().generatedAlwaysAsIdentity(), participantId: text("participant_id").notNull(), itineraryId: text("itinerary_id").notNull(), choice: text("choice").notNull() }, (table) => [uniqueIndex("vote_once").on(table.participantId, table.itineraryId)]);
export const comments = pgTable("comments", { id: integer("id").primaryKey().generatedAlwaysAsIdentity(), participantId: text("participant_id").notNull(), itineraryId: text("itinerary_id").notNull(), body: text("body").notNull(), createdAt: timestamp("created_at").defaultNow().notNull() });
