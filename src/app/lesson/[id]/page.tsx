"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ContentBlock } from "@/components/ContentBlock";
import {
  blockAnchorId,
  parseBlockIndexFromHash,
} from "@/lib/block-navigation";

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

function isDeliveredBlock(block: Block): boolean {
  return block.status === "delivered" && block.content.trim().length > 0;
}

export default function LessonPage() {
  const params = useParams();
  const id = params.id as string;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingInitial, setGeneratingInitial] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [streamingBlock, setStreamingBlock] = useState<{
    id: string;
    blockIndex: number;
    title?: string | null;
    content: string;
  } | null>(null);
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

  const scrollToBlock = useCallback((blockIndex: number) => {
    const anchor = blockAnchorId(blockIndex);
    const element = document.getElementById(anchor);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.history.replaceState(null, "", `#${anchor}`);
  }, []);

  useEffect(() => {
    if (!lesson || loading || generatingInitial) return;

    const scrollFromHash = () => {
      const blockIndex = parseBlockIndexFromHash(window.location.hash);
      if (blockIndex == null) return;

      const block = lesson.blocks.find(
        (item) => item.blockIndex === blockIndex && isDeliveredBlock(item)
      );
      if (!block) return;

      requestAnimationFrame(() => {
        scrollToBlock(block.blockIndex);
      });
    };

    scrollFromHash();
    window.addEventListener("hashchange", scrollFromHash);
    return () => window.removeEventListener("hashchange", scrollFromHash);
  }, [lesson, loading, generatingInitial, scrollToBlock]);

  useEffect(() => {
    if (!lesson || loading || generatingInitial) return;

    const hasDeliveredContent = lesson.blocks.some(isDeliveredBlock);
    const needsInitialGeneration =
      lesson.blocks.length === 0 ||
      (lesson.blocks.length > 0 && !hasDeliveredContent);

    if (!needsInitialGeneration) return;

    setGeneratingInitial(true);
    fetch(`/api/lessons/${id}/content/generate-all`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to generate lesson");
        await fetchLesson();
      })
      .catch(() => setError("Failed to generate lesson content"))
      .finally(() => setGeneratingInitial(false));
  }, [lesson, loading, generatingInitial, id, fetchLesson]);

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

  async function handleGenerateNext() {
    if (!lesson || generatingNext) return;

    const nextBlock = lesson.blocks.find((block) => !isDeliveredBlock(block));
    if (!nextBlock) return;

    setGeneratingNext(true);
    setError(null);
    setStreamingBlock({
      id: nextBlock.id,
      blockIndex: nextBlock.blockIndex,
      title: nextBlock.title,
      content: "",
    });

    try {
      const res = await fetch(`/api/lessons/${id}/content`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate next block");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setStreamingBlock((prev) =>
          prev ? { ...prev, content } : prev
        );
      }

      await fetchLesson();
    } catch {
      setError("Failed to generate next section");
    } finally {
      setStreamingBlock(null);
      setGeneratingNext(false);
    }
  }

  const deliveredBlocks = lesson?.blocks.filter(isDeliveredBlock) ?? [];
  const nextPendingBlock = lesson?.blocks.find((block) => !isDeliveredBlock(block));
  const readCount = deliveredBlocks.filter((b) => b.read).length;
  const progressPct =
    deliveredBlocks.length > 0
      ? Math.round((readCount / deliveredBlocks.length) * 100)
      : 0;
  const isDone =
    deliveredBlocks.length > 0 &&
    lesson !== null &&
    deliveredBlocks.length === lesson.blocks.length &&
    progressPct === 100;
  const totalOutlineBlocks = lesson?.blocks.length ?? 0;
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-slate-950 text-slate-100">
        <div className="animate-pulse">Loading...</div>
      </main>
    );
  }

  if (generatingInitial || (lesson?.blocks.length === 0 && !error)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-slate-950 text-slate-100">
        <div className="text-center">
          <div className="animate-pulse">
            Preparing lesson overview and first section...
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
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

          {totalOutlineBlocks > 0 && (
            <details
              className="mb-8 rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden"
              open
            >
              <summary className="px-4 py-3 cursor-pointer font-medium text-slate-200 hover:bg-slate-700/50">
                Lesson overview ({deliveredBlocks.length} of {totalOutlineBlocks}{" "}
                section{totalOutlineBlocks === 1 ? "" : "s"} generated)
              </summary>
              <ol className="list-decimal list-inside divide-y divide-slate-700/50 px-4 py-2">
                {lesson.blocks.map((block) => {
                  const ready = isDeliveredBlock(block);
                  const title = block.title ?? `Block ${block.blockIndex + 1}`;

                  return (
                    <li
                      key={block.id}
                      className={`py-2 text-sm ${
                        ready ? "text-slate-300" : "text-slate-500 italic"
                      }`}
                    >
                      {ready ? (
                        <a
                          href={`#${blockAnchorId(block.blockIndex)}`}
                          onClick={(event) => {
                            event.preventDefault();
                            scrollToBlock(block.blockIndex);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          {title}
                        </a>
                      ) : (
                        title
                      )}                      
                    </li>
                  );
                })}
              </ol>
            </details>
          )}

          {deliveredBlocks.map((block) => (
            <div
              key={block.id}
              id={blockAnchorId(block.blockIndex)}
              className="scroll-mt-8"
            >
              <ContentBlock
                content={block.content}
                blockNumber={block.blockIndex + 1}
                title={block.title}
                blockId={block.id}
                auditPassed={block.auditPassed ?? null}
                read={block.read ?? false}
                onReadToggle={
                  togglingRead === block.id ? undefined : handleReadToggle
                }
              />
            </div>
          ))}

          {streamingBlock && (
            <div className="w-full text-left block opacity-90">
              <ContentBlock
                content={streamingBlock.content || "Generating..."}
                blockNumber={streamingBlock.blockIndex + 1}
                title={streamingBlock.title}
                blockId={streamingBlock.id}
              />
            </div>
          )}

          {nextPendingBlock && !streamingBlock && (
            <div className="rounded-lg border border-dashed border-slate-600 bg-slate-800/30 p-6 mb-6 text-center">
              <p className="text-slate-400 text-sm mb-4">
                Next section:{" "}
                <span className="text-slate-200">
                  {nextPendingBlock.title ??
                    `Block ${nextPendingBlock.blockIndex + 1}`}
                </span>
              </p>
              <button
                type="button"
                onClick={handleGenerateNext}
                disabled={generatingNext}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {generatingNext ? "Generating..." : "Generate next section"}
              </button>
            </div>
          )}
      </div>
    </main>
  );
}
