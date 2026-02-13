"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSession } from "@/lib/services/sessions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import Link from "next/link";

export default function NewSessionPage() {
  const { studyId } = useParams<{ studyId: string }>();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [passage, setPassage] = useState("");
  const [questionsText, setQuestionsText] = useState("");

  async function onCreate() {
    setSaving(true);
    setError(null);

    try {
      const scheduledAt = date ? new Date(date) : null;

      const questions = questionsText
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean);

      await createSession(studyId, {
        scheduledAt,
        passageRef: passage.trim(),
        questions,
      });

      router.push(`/s/${studyId}`);
    } catch (e: any) {
      setError(e?.message ?? "Could not create session.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          New Session
        </h1>
        <Link
          href={`/s/${studyId}`}
          className="text-sm text-slate-500 hover:text-[var(--accent)] dark:text-slate-400"
        >
          Back
        </Link>
      </div>

      <div className="mt-6 grid gap-5">
        <div className="w-full">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Date &amp; time
          </label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <Input
          label="Scripture passage"
          placeholder="e.g., John 3"
          value={passage}
          onChange={(e) => setPassage(e.target.value)}
        />

        <Textarea
          label="Starter questions (one per line)"
          value={questionsText}
          onChange={(e) => setQuestionsText(e.target.value)}
          placeholder={"What stands out to you?\nWhat do we learn about God?"}
          className="min-h-[120px]"
        />

        {error && <ErrorMessage title="Oops">{error}</ErrorMessage>}

        <Button onClick={onCreate} disabled={saving}>
          {saving ? "Creating..." : "Create session"}
        </Button>
      </div>
    </main>
  );
}
