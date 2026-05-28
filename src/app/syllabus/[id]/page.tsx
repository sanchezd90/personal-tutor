"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmModal } from "@/components/ConfirmModal";
import { SyllabusTree } from "@/components/SyllabusTree";
import { QAHistoryPanel } from "@/components/QAHistoryPanel";

type Module = {
  id: string;
  syllabusId: string;
  order: number;
  title: string;
  lessons: { id: string; moduleId: string; order: number; title: string }[];
};

type Syllabus = {
  id: string;
  subjectId: string;
  structure: unknown;
  createdAt: string;
  modules: Module[];
  progressPct?: number;
  isDone?: boolean;
  doneLessons?: number;
  totalLessons?: number;
};

export default function SyllabusPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQAHistory, setShowQAHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSyllabus = useCallback(async () => {
    try {
      const res = await fetch(`/api/syllabi/${id}`);
      if (res.status === 404) {
        setError("Syllabus not found");
        setSyllabus(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSyllabus(data);
      setError(null);
    } catch {
      setError("Failed to load syllabus");
      setSyllabus(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSyllabus();
  }, [fetchSyllabus]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/syllabi/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/");
    } catch {
      setError("Failed to delete syllabus");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-slate-950 text-slate-100">
        <div className="animate-pulse">Loading...</div>
      </main>
    );
  }

  if (error && !syllabus) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-100">
        <p className="text-red-400 mb-4">{error}</p>
        <Link
          href="/"
          className="text-emerald-400 hover:text-emerald-300 underline"
        >
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-slate-400 hover:text-slate-200 text-sm mb-6 inline-block"
        >
          ← Back to home
        </Link>

        {!syllabus ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-6">Syllabus not found.</p>
            <Link
              href="/"
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="text-2xl font-bold">Syllabus</h1>
                  {syllabus.isDone && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                      Done
                    </span>
                  )}
                </div>
                <p className="mt-1 text-slate-400 text-sm">
                  {syllabus.progressPct ?? 0}% complete
                  {syllabus.totalLessons != null &&
                    ` (${syllabus.doneLessons ?? 0}/${syllabus.totalLessons} lessons)`}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
                <button
                  onClick={() => setShowQAHistory(!showQAHistory)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm whitespace-nowrap w-full sm:w-auto"
                >
                  {showQAHistory ? "Hide" : "Show"} Q&A History
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-red-300 text-sm disabled:opacity-50 whitespace-nowrap w-full sm:w-auto"
                >
                  Delete
                </button>
              </div>
            </div>

            {showQAHistory && (
              <QAHistoryPanel
                syllabusId={syllabus.id}
                onClose={() => setShowQAHistory(false)}
              />
            )}

            <SyllabusTree modules={syllabus.modules} />
          </>
        )}
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete syllabus?"
        message="This cannot be undone. All modules, lessons, and progress for this syllabus will be permanently removed."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setShowDeleteConfirm(false);
        }}
      />
    </main>
  );
}
