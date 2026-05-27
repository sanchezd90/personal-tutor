/** Cheaper / structured tasks: syllabus, outlines, summaries, audit, Q&A */
export const MODEL_STRUCTURED = "gpt-4o-mini";

/** Lesson block prose (higher-quality model for dense teaching content) */
export const MODEL_CONTENT = "gpt-4.1";

/** Multi-page booklet-depth section (~several printed pages of teaching prose) */
export const CONTENT_MAX_TOKENS = 6000;

/** Block summary for next-section context (longer blocks need richer summaries) */
export const SUMMARY_MAX_TOKENS = 450;

/** Large syllabus JSON (~28 lessons with objectives and block plans) */
export const SYLLABUS_MAX_TOKENS = 16_000;

/** Long blocks: compress before Q&A */
export const QA_FULL_CONTENT_THRESHOLD = 12_000;

/** Batch audit: max chars per block when auditing multiple blocks at once */
export const AUDIT_BATCH_CONTENT_CHARS = 8000;
