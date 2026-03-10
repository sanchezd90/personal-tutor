"use client";

import Link from "next/link";

type Lesson = {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  progressPct?: number;
  isDone?: boolean;
};

type Module = {
  id: string;
  syllabusId: string;
  order: number;
  title: string;
  lessons: Lesson[];
};

type SyllabusTreeProps = {
  syllabusId: string;
  modules: Module[];
};

export function SyllabusTree({ syllabusId, modules }: SyllabusTreeProps) {
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
            {mod.lessons.map((lesson) => (
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
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
