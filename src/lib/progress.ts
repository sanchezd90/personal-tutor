import { db } from "@/lib/db";
import {
  modules,
  lessons,
  contentBlocks,
  blockReads,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  normalizeLessonOutline,
  type SyllabusStructure,
} from "@/lib/ai/syllabus-types";

export type BlockSummary = {
  id: string | null;
  blockIndex: number;
  title: string;
  delivered: boolean;
  read: boolean;
};

export type LessonProgressFields = {
  progressPct: number;
  isDone: boolean;
  readCount: number;
  totalBlocks: number;
  blocks: BlockSummary[];
};

export type SyllabusProgressSummary = {
  progressPct: number;
  isDone: boolean;
  doneLessons: number;
  totalLessons: number;
};

type ContentBlockRow = {
  id: string;
  lessonId: string;
  blockIndex: number;
  title: string | null;
  status: string;
  content: string;
};

export function isDeliveredBlock(block: {
  status: string;
  content: string;
}): boolean {
  return block.status === "delivered" && block.content.trim().length > 0;
}

function getOutlineTitles(
  structure: SyllabusStructure | null | undefined,
  moduleOrder: number,
  lessonOrder: number
): string[] | undefined {
  const lessonStructure =
    structure?.modules?.[moduleOrder]?.lessons?.[lessonOrder];
  if (!lessonStructure) return undefined;
  const outline = normalizeLessonOutline(lessonStructure);
  return outline?.titles;
}

export function computeLessonProgress(
  blocks: ContentBlockRow[],
  readBlockIds: Set<string>,
  outlineTitles?: string[]
): LessonProgressFields {
  let blockSummaries: BlockSummary[];

  if (blocks.length > 0) {
    const sorted = [...blocks].sort((a, b) => a.blockIndex - b.blockIndex);
    blockSummaries = sorted.map((block) => {
      const delivered = isDeliveredBlock(block);
      return {
        id: block.id,
        blockIndex: block.blockIndex,
        title: block.title ?? `Block ${block.blockIndex + 1}`,
        delivered,
        read: delivered && readBlockIds.has(block.id),
      };
    });
  } else if (outlineTitles && outlineTitles.length > 0) {
    blockSummaries = outlineTitles.map((title, index) => ({
      id: null,
      blockIndex: index,
      title,
      delivered: false,
      read: false,
    }));
  } else {
    blockSummaries = [];
  }

  const deliveredBlocks = blockSummaries.filter((block) => block.delivered);
  const readCount = deliveredBlocks.filter((block) => block.read).length;
  const totalBlocks = deliveredBlocks.length;
  const progressPct =
    totalBlocks > 0 ? Math.round((readCount / totalBlocks) * 100) : 0;
  const allOutlineDelivered =
    blocks.length > 0 && blocks.every(isDeliveredBlock);
  const isDone =
    totalBlocks > 0 && progressPct === 100 && allOutlineDelivered;

  return {
    progressPct,
    isDone,
    readCount,
    totalBlocks,
    blocks: blockSummaries,
  };
}

function summarizeLessons(lessonProgress: LessonProgressFields[]): SyllabusProgressSummary {
  const doneLessons = lessonProgress.filter((lesson) => lesson.isDone).length;
  const totalLessons = lessonProgress.length;
  const progressPct =
    totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;
  const isDone = totalLessons > 0 && progressPct === 100;

  return { progressPct, isDone, doneLessons, totalLessons };
}

export async function fetchBlocksAndReadsForLessons(
  lessonIds: string[],
  userId: string
): Promise<{
  blocksByLesson: Map<string, ContentBlockRow[]>;
  readBlockIds: Set<string>;
}> {
  const blocksByLesson = new Map<string, ContentBlockRow[]>();
  for (const lessonId of lessonIds) {
    blocksByLesson.set(lessonId, []);
  }

  if (lessonIds.length === 0) {
    return { blocksByLesson, readBlockIds: new Set() };
  }

  const allBlocks = await db
    .select({
      id: contentBlocks.id,
      lessonId: contentBlocks.lessonId,
      blockIndex: contentBlocks.blockIndex,
      title: contentBlocks.title,
      status: contentBlocks.status,
      content: contentBlocks.content,
    })
    .from(contentBlocks)
    .where(inArray(contentBlocks.lessonId, lessonIds));

  for (const block of allBlocks) {
    blocksByLesson.get(block.lessonId)?.push(block);
  }

  const deliveredBlockIds = allBlocks
    .filter(isDeliveredBlock)
    .map((block) => block.id);

  const readBlockIds = new Set<string>();
  if (deliveredBlockIds.length > 0) {
    const reads = await db
      .select({ contentBlockId: blockReads.contentBlockId })
      .from(blockReads)
      .where(
        and(
          inArray(blockReads.contentBlockId, deliveredBlockIds),
          eq(blockReads.userId, userId)
        )
      );
    for (const read of reads) {
      readBlockIds.add(read.contentBlockId);
    }
  }

  return { blocksByLesson, readBlockIds };
}

export async function computeSyllabusProgressSummary(
  syllabusId: string,
  userId: string
): Promise<SyllabusProgressSummary> {
  const moduleList = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.syllabusId, syllabusId));

  if (moduleList.length === 0) {
    return { progressPct: 0, isDone: false, doneLessons: 0, totalLessons: 0 };
  }

  const moduleIds = moduleList.map((mod) => mod.id);
  const lessonList = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(inArray(lessons.moduleId, moduleIds));

  if (lessonList.length === 0) {
    return { progressPct: 0, isDone: false, doneLessons: 0, totalLessons: 0 };
  }

  const lessonIds = lessonList.map((lesson) => lesson.id);
  const { blocksByLesson, readBlockIds } = await fetchBlocksAndReadsForLessons(
    lessonIds,
    userId
  );

  const lessonProgress = lessonIds.map((lessonId) =>
    computeLessonProgress(blocksByLesson.get(lessonId) ?? [], readBlockIds)
  );

  return summarizeLessons(lessonProgress);
}

export async function computeSyllabusProgressSummaries(
  syllabusIds: string[],
  userId: string
): Promise<Map<string, SyllabusProgressSummary>> {
  const summaries = new Map<string, SyllabusProgressSummary>();
  for (const syllabusId of syllabusIds) {
    summaries.set(syllabusId, {
      progressPct: 0,
      isDone: false,
      doneLessons: 0,
      totalLessons: 0,
    });
  }

  if (syllabusIds.length === 0) {
    return summaries;
  }

  const moduleList = await db
    .select({ id: modules.id, syllabusId: modules.syllabusId })
    .from(modules)
    .where(inArray(modules.syllabusId, syllabusIds));

  const modulesBySyllabus = new Map<string, string[]>();
  for (const mod of moduleList) {
    const ids = modulesBySyllabus.get(mod.syllabusId) ?? [];
    ids.push(mod.id);
    modulesBySyllabus.set(mod.syllabusId, ids);
  }

  const moduleIds = moduleList.map((mod) => mod.id);
  if (moduleIds.length === 0) {
    return summaries;
  }

  const lessonList = await db
    .select({
      id: lessons.id,
      moduleId: lessons.moduleId,
      order: lessons.order,
    })
    .from(lessons)
    .where(inArray(lessons.moduleId, moduleIds));

  const moduleToSyllabus = new Map(
    moduleList.map((mod) => [mod.id, mod.syllabusId])
  );
  const lessonsBySyllabus = new Map<string, typeof lessonList>();
  for (const lesson of lessonList) {
    const syllabusId = moduleToSyllabus.get(lesson.moduleId);
    if (!syllabusId) continue;
    const list = lessonsBySyllabus.get(syllabusId) ?? [];
    list.push(lesson);
    lessonsBySyllabus.set(syllabusId, list);
  }

  const lessonIds = lessonList.map((lesson) => lesson.id);
  const { blocksByLesson, readBlockIds } = await fetchBlocksAndReadsForLessons(
    lessonIds,
    userId
  );

  for (const syllabusId of syllabusIds) {
    const syllabusLessons = lessonsBySyllabus.get(syllabusId) ?? [];
    const lessonProgress = syllabusLessons.map((lesson) =>
      computeLessonProgress(
        blocksByLesson.get(lesson.id) ?? [],
        readBlockIds
      )
    );
    summaries.set(syllabusId, summarizeLessons(lessonProgress));
  }

  return summaries;
}

export async function enrichModulesWithProgress(
  moduleList: Array<{
    id: string;
    syllabusId: string;
    order: number;
    title: string;
  }>,
  userId: string,
  structure?: SyllabusStructure | null
) {
  const moduleIds = moduleList.map((mod) => mod.id);
  const lessonList =
    moduleIds.length === 0
      ? []
      : await db
          .select()
          .from(lessons)
          .where(inArray(lessons.moduleId, moduleIds))
          .orderBy(lessons.order);

  const lessonsByModule = new Map<string, typeof lessonList>();
  for (const lesson of lessonList) {
    const list = lessonsByModule.get(lesson.moduleId) ?? [];
    list.push(lesson);
    lessonsByModule.set(lesson.moduleId, list);
  }

  const lessonIds = lessonList.map((lesson) => lesson.id);
  const { blocksByLesson, readBlockIds } = await fetchBlocksAndReadsForLessons(
    lessonIds,
    userId
  );

  const modulesWithLessons = moduleList.map((mod) => {
    const modLessons = (lessonsByModule.get(mod.id) ?? []).sort(
      (a, b) => a.order - b.order
    );
    const lessonsWithProgress = modLessons.map((lesson) => {
      const outlineTitles = getOutlineTitles(structure, mod.order, lesson.order);
      const progress = computeLessonProgress(
        blocksByLesson.get(lesson.id) ?? [],
        readBlockIds,
        outlineTitles
      );
      return { ...lesson, ...progress };
    });
    return { ...mod, lessons: lessonsWithProgress };
  });

  const allLessons = modulesWithLessons.flatMap((mod) => mod.lessons);
  const summary = summarizeLessons(allLessons);

  return { modules: modulesWithLessons, ...summary };
}
