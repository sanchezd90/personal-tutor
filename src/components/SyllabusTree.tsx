"use client";

import Link from "next/link";
import { lessonBlockHref } from "@/lib/block-navigation";

type BlockSummary = {
  id: string | null;
  blockIndex: number;
  title: string;
  delivered: boolean;
  read: boolean;
};

type Lesson = {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  progressPct?: number;
  isDone?: boolean;
  blocks?: BlockSummary[];
};

type Module = {
  id: string;
  syllabusId: string;
  order: number;
  title: string;
  lessons: Lesson[];
};

type SyllabusTreeProps = {
  modules: Module[];
};

export function SyllabusTree({ modules }: SyllabusTreeProps) {
  return (
    <div className="space-y-4">
      {modules.map((mod) => (
        <div
          key={mod.id}
          className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden"
        >
          <div className="px-4 py-3 font-semibold text-slate-200 bg-slate-800/80">
            Module {mod.order + 1}: {mod.title}
          </div>
          <ul className="divide-y divide-slate-700/50">
            {mod.lessons.map((lesson) => {
              const blocks = lesson.blocks ?? [];
              const deliveredCount = blocks.filter((block) => block.delivered).length;
              const readCount = blocks.filter(
                (block) => block.delivered && block.read
              ).length;
              const hasIndex = blocks.length > 0;

              return (
                <li key={lesson.id}>
                  <Link
                    href={`/lesson/${lesson.id}`}
                    className="flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-colors"
                  >
                    <span>
                      {lesson.order + 1}. {lesson.title}
                    </span>
                    <span className="flex items-center gap-2">
                      {lesson.isDone && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">
                          Done
                        </span>
                      )}
                      <span className="text-slate-500 text-xs">
                        {lesson.progressPct ?? 0}%
                      </span>
                    </span>
                  </Link>
                  {hasIndex && (
                    <details className="border-t border-slate-700/50 bg-slate-900/30">
                      <summary className="px-4 py-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-700/30">
                        {readCount > 0 && (
                          <>                            
                            {deliveredCount > 0 && " · "}
                          </>
                        )}
                        {deliveredCount} of {blocks.length} section
                        {blocks.length === 1 ? "" : "s"} generated
                      </summary>
                      <ol className="list-decimal list-inside divide-y divide-slate-700/30 px-4 pb-2">
                        {blocks.map((block) => {
                          const blockClassName = block.delivered
                            ? block.read
                              ? "text-emerald-400/90"
                              : "text-slate-300"
                            : "text-slate-500 italic";

                          return (
                            <li
                              key={`${lesson.id}-${block.blockIndex}`}
                              className={`py-1.5 text-sm flex items-center justify-between gap-2 ${blockClassName}`}
                            >
                              <span className="min-w-0">
                                {block.delivered ? (
                                  <Link
                                    href={lessonBlockHref(
                                      lesson.id,
                                      block.blockIndex
                                    )}
                                    className="hover:text-emerald-300 hover:underline"
                                  >
                                    {block.title}
                                  </Link>
                                ) : (
                                  block.title
                                )}
                              </span>
                              {block.delivered && block.read && (
                                <span className="shrink-0 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">
                                  Read
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
