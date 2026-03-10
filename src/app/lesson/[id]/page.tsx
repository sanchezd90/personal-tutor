"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ContentBlock } from "@/components/ContentBlock";
import { QASidebar } from "@/components/QASidebar";

type Block = {
  id: string;
  lessonId: string;
  blockIndex: number;
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
  blocks: Block[];
};

export default function LessonPage() {
  const params = useParams();
  const id = params.id as string;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
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

  async function loadNextBlock() {
    setStreaming(true);
    setStreamingContent("");
    setSelectedBlockId(null);

    try {
      const res = await fetch(`/api/lessons/${id}/content`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to fetch content");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      let content = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        content += chunk;
        setStreamingContent(content);
      }

      await fetchLesson();
    } catch {
      setError("Failed to load content");
    } finally {
      setStreaming(false);
    }
  }

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
  let nextButtonLabel = "Next Block";
  if (streaming) nextButtonLabel = "Loading...";
  else if (lesson && lesson.blocks.length === 0) nextButtonLabel = "Start Lesson";

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-slate-950 text-slate-100">
        <div className="animate-pulse">Loading...</div>
      </main>
    );
  }

  if (error || !lesson) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-100">
        <p className="text-red-400 mb-4">{error ?? "Lesson not found"}</p>
        <Link href="/" className="text-emerald-400 hover:text-emerald-300 underline">
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex bg-slate-950 text-slate-100">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-8">
          <Link
            href="/"
            className="text-slate-400 hover:text-slate-200 text-sm mb-6 inline-block"
          >
            ← Back to home
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

          {lesson.blocks.map((block, index) => (
            <div
              key={block.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedBlockId(block.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedBlockId(block.id);
                }
              }}
              className="cursor-pointer"
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
            </div>
          ))}

          {streaming && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 mb-6 animate-pulse">
              <span className="text-slate-400 text-sm">Loading...</span>
              {streamingContent && (
                <div className="mt-4 prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-headings:text-slate-100">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                </div>
              )}
            </div>
          )}

          <button
            onClick={loadNextBlock}
            disabled={streaming}
            className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-medium"
          >
            {nextButtonLabel}
          </button>
        </div>
      </div>

      <QASidebar contentBlockId={selectedBlockId} />
    </main>
  );
}
