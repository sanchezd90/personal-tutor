"use client";

import { useEffect, useState } from "react";

type QAItem = {
  questionId: string;
  question: string;
  answer: string;
  askedAt: string;
};

type QASidebarProps = {
  contentBlockId: string | null;
};

export function QASidebar({ contentBlockId }: QASidebarProps) {
  const [items, setItems] = useState<QAItem[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingQA, setLoadingQA] = useState(false);

  useEffect(() => {
    if (!contentBlockId) {
      setItems([]);
      return;
    }
    setLoadingQA(true);
    fetch(`/api/content-blocks/${contentBlockId}/questions`)
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoadingQA(false));
  }, [contentBlockId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contentBlockId || !question.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/content-blocks/${contentBlockId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setItems((prev) => [
        ...prev,
        {
          questionId: data.questionId,
          question: data.question,
          answer: data.answer,
          askedAt: new Date().toISOString(),
        },
      ]);
      setQuestion("");
    } catch {
      // Could show error toast
    } finally {
      setLoading(false);
    }
  }

  if (!contentBlockId) {
    return (
      <div className="w-80 flex-shrink-0 p-4 border-l border-slate-700 bg-slate-900/50">
        <p className="text-slate-500 text-sm">Select a block to ask questions</p>
      </div>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 flex flex-col border-l border-slate-700 bg-slate-900/50">
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-semibold text-slate-200">Q&A</h3>
        <form onSubmit={handleSubmit} className="mt-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this block..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="mt-2 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? "..." : "Ask"}
          </button>
        </form>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingQA ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500 text-sm">No questions yet.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.questionId}
              className="border-l-2 border-emerald-500/50 pl-3 py-1"
            >
              <p className="text-slate-200 font-medium text-sm">{item.question}</p>
              <p className="text-slate-400 text-sm mt-1">{item.answer}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
