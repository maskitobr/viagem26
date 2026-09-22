import { boolean, doublePrecision, integer, pgTable, primaryKey, real, text, timestamp } from "drizzle-orm/pg-core";

// Tabelas legadas (participants/votes/comments) permanecem no banco; o app novo usa as abaixo.
export const people = pgTable("people", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  token: text("token").notNull().unique(),
  isAdmin: boolean("is_admin").notNull().default(false),
  photoKey: text("photo_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: text("id").primaryKey(),
  city: text("city").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  address: text("address"),
  mapUrl: text("map_url"),
  placeId: text("place_id"),
  note: text("note"),
  rating: real("rating"),
  priceLevel: text("price_level"),
  photoName: text("photo_name"),
  imageKey: text("image_key"),
  visitDate: text("visit_date"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  isBase: boolean("is_base").notNull().default(false),
  visitedBy: text("visited_by"),
  visitedAt: timestamp("visited_at", { withTimezone: true }),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const itemVotes = pgTable("item_votes", {
  personId: text("person_id").notNull(),
  itemId: text("item_id").notNull(),
  choice: text("choice").notNull(),
}, (t) => [primaryKey({ columns: [t.personId, t.itemId] })]);

export const itemSeen = pgTable("item_seen", {
  personId: text("person_id").notNull(),
  itemId: text("item_id").notNull(),
  seenAt: timestamp("seen_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.personId, t.itemId] })]);

export const photos = pgTable("photos", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  city: text("city").notNull(),
  itemId: text("item_id"),
  key: text("key").notNull(),
  takenAt: timestamp("taken_at", { withTimezone: true }),
  size: integer("size"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
