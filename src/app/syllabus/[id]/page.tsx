"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
};

export default function SyllabusPage() {
  const params = useParams();
  const id = params.id as string;
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQAHistory, setShowQAHistory] = useState(false);

  useEffect(() => {
    fetchSyllabus();
  }, [id]);

  async function fetchSyllabus() {
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
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold">Syllabus</h1>
              <button
                onClick={() => setShowQAHistory(!showQAHistory)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
              >
                {showQAHistory ? "Hide" : "Show"} Q&A History
              </button>
            </div>

            {showQAHistory && (
              <QAHistoryPanel
                syllabusId={syllabus.id}
                onClose={() => setShowQAHistory(false)}
              />
            )}

            <SyllabusTree syllabusId={syllabus.id} modules={syllabus.modules} />
          </>
        )}
      </div>
    </main>
  );
}
