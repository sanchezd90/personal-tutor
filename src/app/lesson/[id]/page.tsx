"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ContentBlock } from "@/components/ContentBlock";
import { QASidebar } from "@/components/QASidebar";

type Block = {
  id: string;
  lessonId: string;
  blockIndex: number;
  title?: string | null;
  content: string;
  status: string;
  deliveredAt: string;
  auditPassed?: boolean | null;
  read?: boolean;
};

type Lesson = {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  moduleTitle?: string;
  syllabusId?: string;
  blocks: Block[];
};

export default function LessonPage() {
  const params = useParams();
  const id = params.id as string;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [togglingRead, setTogglingRead] = useState<string | null>(null);

  const fetchLesson = useCallback(async () => {
    try {
      const res = await fetch(`/api/lessons/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLesson(data);
      setError(null);
    } catch {
      setError("Failed to load lesson");
      setLesson(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  useEffect(() => {
    if (!lesson || loading || generating) return;
    if (lesson.blocks.length > 0) return;

    setGenerating(true);
    fetch(`/api/lessons/${id}/content/generate-all`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to generate lesson");
        await fetchLesson();
      })
      .catch(() => setError("Failed to generate lesson content"))
      .finally(() => setGenerating(false));
  }, [lesson, loading, generating, id, fetchLesson]);

  async function handleReadToggle(blockId: string, read: boolean) {
    setTogglingRead(blockId);
    try {
      const res = await fetch(`/api/content-blocks/${blockId}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
      if (res.ok) await fetchLesson();
    } catch {
      setError("Failed to update read status");
    } finally {
      setTogglingRead(null);
    }
  }

  const readCount = lesson?.blocks.filter((b) => b.read).length ?? 0;
  const totalBlocks = lesson?.blocks.length ?? 0;
  const progressPct =
    totalBlocks > 0 ? Math.round((readCount / totalBlocks) * 100) : 0;
  const isDone = totalBlocks > 0 && progressPct === 100;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-slate-950 text-slate-100">
        <div className="animate-pulse">Loading...</div>
      </main>
    );
  }

  if (lesson?.blocks.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-slate-950 text-slate-100">
        <div className="text-center">
          <div className="animate-pulse">
            Preparing lesson... This may take a minute.
          </div>
        </div>
      </main>
    );
  }

  if (error || !lesson) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-100">
        <p className="text-red-400 mb-4">{error ?? "Lesson not found"}</p>
        <Link
          href={lesson?.syllabusId ? `/syllabus/${lesson.syllabusId}` : "/"}
          className="text-emerald-400 hover:text-emerald-300 underline"
        >
          {lesson?.syllabusId ? "Back to syllabus" : "Back to home"}
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex bg-slate-950 text-slate-100">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-8">
          <Link
            href={lesson.syllabusId ? `/syllabus/${lesson.syllabusId}` : "/"}
            className="text-slate-400 hover:text-slate-200 text-sm mb-6 inline-block"
          >
            ← Back to syllabus
          </Link>

          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            <div className="flex items-center gap-2">
              {isDone && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                  Done
                </span>
              )}
              <span className="text-slate-400 text-sm">
                {progressPct}% complete
              </span>
            </div>
          </div>
          {lesson.moduleTitle && (
            <p className="text-slate-400 text-sm mb-8">{lesson.moduleTitle}</p>
          )}

          {totalBlocks > 0 && (
            <details
              className="mb-8 rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden"
              open
            >
              <summary className="px-4 py-3 cursor-pointer font-medium text-slate-200 hover:bg-slate-700/50">
                Lesson overview ({totalBlocks} block{totalBlocks === 1 ? "" : "s"})
              </summary>
              <ol className="list-decimal list-inside divide-y divide-slate-700/50 px-4 py-2">
                {lesson.blocks.map((block, index) => (
                  <li
                    key={block.id}
                    className="py-2 text-slate-300 text-sm"
                  >
                    {block.title ?? `Block ${index + 1}`}
                  </li>
                ))}
              </ol>
            </details>
          )}

          {lesson.blocks.map((block, index) => (
            <button
              key={block.id}
              type="button"
              onClick={() => setSelectedBlockId(block.id)}
              className="w-full text-left cursor-pointer block"
            >
              <ContentBlock
                content={block.content}
                blockNumber={index + 1}
                blockId={block.id}
                auditPassed={block.auditPassed ?? null}
                read={block.read ?? false}
                onReadToggle={
                  togglingRead === block.id ? undefined : handleReadToggle
                }
              />
            </button>
          ))}
        </div>
      </div>

      <QASidebar contentBlockId={selectedBlockId} />
    </main>
  );
}
