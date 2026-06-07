import { pgTable, text, timestamp, boolean, integer, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  level: text("level").notNull(), // Iniciante, Intermediário, Avançado
  voice: text("voice").notNull(), // Kore, Zephyr
  createdHour: integer("created_hour").notNull(), // 0-23
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .references(() => sessions.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(), // user or tutor
  text: text("text").notNull(),
  translation: text("translation"),
  correction: text("correction"),
  audioBase64: text("audio_base64"),
  isSpoken: boolean("is_spoken").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
