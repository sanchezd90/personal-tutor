/** Cheaper / structured tasks: syllabus, outlines, summaries, audit, Q&A */
export const MODEL_STRUCTURED = "gpt-4o-mini";

/** Lesson block prose */
export const MODEL_CONTENT = "gpt-4o-mini";

/** ~2–4 paragraphs */
export const CONTENT_MAX_TOKENS = 900;

/** Compact block summary for next-block context */
export const SUMMARY_MAX_TOKENS = 150;

/** Long blocks: compress before Q&A */
export const QA_FULL_CONTENT_THRESHOLD = 2000;
