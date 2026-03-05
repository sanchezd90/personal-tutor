import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const subjects = pgTable("subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const syllabi = pgTable("syllabi", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  structure: jsonb("structure").$type<{ modules: Array<{ title: string; lessons: Array<{ title: string }> }> }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const modules = pgTable("modules", {
  id: text("id").primaryKey(),
  syllabusId: text("syllabus_id")
    .notNull()
    .references(() => syllabi.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  title: text("title").notNull(),
});

export const lessons = pgTable("lessons", {
  id: text("id").primaryKey(),
  moduleId: text("module_id")
    .notNull()
    .references(() => modules.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  title: text("title").notNull(),
});

export const contentBlocks = pgTable("content_blocks", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  blockIndex: integer("block_index").notNull(),
  content: text("content").notNull(),
  status: text("status").default("delivered").notNull(),
  deliveredAt: timestamp("delivered_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  contentBlockId: text("content_block_id")
    .notNull()
    .references(() => contentBlocks.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  askedAt: timestamp("asked_at").defaultNow().notNull(),
});

export const answers = pgTable("answers", {
  id: text("id").primaryKey(),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  answer: text("answer").notNull(),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
});

export const auditResults = pgTable("audit_results", {
  id: text("id").primaryKey(),
  contentBlockId: text("content_block_id")
    .notNull()
    .references(() => contentBlocks.id, { onDelete: "cascade" }),
  passed: boolean("passed").notNull(),
  feedback: text("feedback"),
  auditedAt: timestamp("audited_at").defaultNow().notNull(),
});
