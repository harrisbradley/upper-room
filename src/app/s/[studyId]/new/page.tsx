"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSession } from "@/lib/services/sessions";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import Link from "next/link";

export default function NewSessionPage() {
  const { studyId } = useParams<{ studyId: string }>();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [passage, setPassage] = useState("");
  const [questionsText, setQuestionsText] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
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
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Could not create session."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          New session
        </h1>
        <Link href={`/s/${studyId}`}>
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <Card>
        <CardTitle>Create session details</CardTitle>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Add a time, passage, and discussion prompts for your group.
        </p>

        <form onSubmit={onCreate} className="mt-5 grid gap-4">
          <Input
            label="Date and time"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={saving}
          />

          <Input
            label="Scripture passage"
            placeholder="e.g. John 3:16-21"
            value={passage}
            onChange={(e) => setPassage(e.target.value)}
            disabled={saving}
          />

          <Textarea
            label="Starter questions (one per line)"
            placeholder={"What stands out to you?\nWhat do we learn about God?\nHow can we apply this this week?"}
            value={questionsText}
            onChange={(e) => setQuestionsText(e.target.value)}
            rows={6}
            disabled={saving}
          />

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create session"}
            </Button>
            <Link href={`/s/${studyId}`}>
              <Button type="button" variant="secondary" disabled={saving}>
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </main>
  );
}