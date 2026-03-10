"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type SyllabusItem = {
  id: string;
  subjectId: string;
  subjectName: string;
  createdAt: string;
};

export default function Home() {
  const [syllabi, setSyllabi] = useState<SyllabusItem[]>([]);
  const [loadingSyllabi, setLoadingSyllabi] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchSyllabi();
  }, []);

  async function fetchSyllabi() {
    try {
      const res = await fetch("/api/syllabi");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSyllabi(data);
    } catch {
      setSyllabi([]);
    } finally {
      setLoadingSyllabi(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subject.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create subject");
      }

      const { id } = await res.json();
      router.push(`/subject/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Supabase may not be configured
    }
    router.refresh();
    window.location.href = "/login";
  }

  const showFormDirectly = !loadingSyllabi && syllabi.length === 0;

  return (
    <main className="min-h-screen flex flex-col p-8 bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Personal Tutor</h1>
          <button
            onClick={signOut}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Sign out
          </button>
        </div>

        {loadingSyllabi ? (
          <div className="animate-pulse">Loading...</div>
        ) : syllabi.length > 0 ? (
          <>
            <h2 className="text-lg font-semibold text-slate-200 mb-4">
              Your syllabi
            </h2>
            <ul className="space-y-3 mb-8">
              {syllabi.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/syllabus/${s.id}`}
                    className="block px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
                  >
                    <span className="font-medium">{s.subjectName}</span>
                    <span className="text-slate-400 text-sm ml-2">
                      — {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {(showFormDirectly || showNewForm) && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-200">
              {showNewForm ? "Start new subject" : "Enter a subject you want to learn"}
            </h2>
            <p className="text-slate-400 text-sm">
              AI will create a syllabus for you.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Linear Algebra, Spanish, Machine Learning"
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !subject.trim()}
                className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? "Creating..." : "Start Learning"}
              </button>
            </form>
          </div>
        )}

        {syllabi.length > 0 && !showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full py-3 px-4 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
          >
            + Start new subject
          </button>
        )}

        {error && (
          <p className="mt-4 text-red-400 text-sm">{error}</p>
        )}
      </div>
    </main>
  );
}
