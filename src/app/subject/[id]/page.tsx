"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Subject = {
  id: string;
  name: string;
};

type SyllabusSummary = {
  id: string;
  subjectId: string;
  createdAt: string;
};

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [subject, setSubject] = useState<Subject | null>(null);
  const [syllabi, setSyllabi] = useState<SyllabusSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchSubject();
    fetchSyllabi();
  }, [id]);

  async function fetchSubject() {
    try {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to fetch");
      const subjects: Subject[] = await res.json();
      const subj = subjects.find((s) => s.id === id);
      setSubject(subj ?? null);
      if (!subj) setError("Subject not found");
    } catch {
      setError("Failed to load subject");
      setSubject(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSyllabi() {
    try {
      const res = await fetch("/api/syllabi");
      if (!res.ok) return;
      const all: { id: string; subjectId: string; createdAt: string }[] =
        await res.json();
      setSyllabi(all.filter((s) => s.subjectId === id));
    } catch {
      // Ignore - syllabi may be empty
    }
  }

  async function generateSyllabus() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/subjects/${id}/syllabus`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate syllabus");
      }
      const data = await res.json();
      router.push(`/syllabus/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-slate-950 text-slate-100">
        <div className="animate-pulse">Loading...</div>
      </main>
    );
  }

  if (error && !subject) {
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

        <h1 className="text-2xl font-bold mb-6">
          {subject?.name ?? "Subject"}
        </h1>

        {syllabi.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-200 mb-3">
              Your syllabi
            </h2>
            <ul className="space-y-2">
              {syllabi.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/syllabus/${s.id}`}
                    className="block px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
                  >
                    Syllabus from{" "}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-center py-8">
          <p className="text-slate-400 mb-6">
            {syllabi.length === 0
              ? "No syllabus yet. Generate one with AI."
              : "Generate another syllabus for this subject."}
          </p>
          <button
            onClick={generateSyllabus}
            disabled={generating}
            className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-medium"
          >
            {generating ? "Generating..." : "Generate Syllabus"}
          </button>
          {error && (
            <p className="mt-4 text-red-400 text-sm">{error}</p>
          )}
        </div>
      </div>
    </main>
  );
}
