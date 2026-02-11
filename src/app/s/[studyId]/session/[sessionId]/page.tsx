"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession, updateSessionBasics } from "@/lib/services/sessions";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default function SessionEditPage() {
  const params = useParams<{ studyId: string; sessionId: string }>();
  const { studyId, sessionId } = params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [passageRef, setPassageRef] = useState("");
  const [questionsText, setQuestionsText] = useState(""); // one per line
  const [leaderNotes, setLeaderNotes] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const s = await getSession(studyId, sessionId);
        if (!s) {
          setLoadError("Session not found.");
          return;
        }

        setPassageRef(s.passage?.reference ?? "");
        setQuestionsText((s.agenda?.questions ?? []).join("\n"));
        setLeaderNotes(s.agenda?.leaderNotes ?? "");
      } catch (e: any) {
        setLoadError(e?.message ?? "Could not load session.");
      } finally {
        setLoading(false);
      }
    })();
  }, [studyId, sessionId]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const questions = questionsText
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean);

      await updateSessionBasics(studyId, sessionId, {
        passageRef: passageRef.trim(),
        questions,
        leaderNotes,
      });
      setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardTitle className="mb-2">Could not open session</CardTitle>
          <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          <div className="mt-5">
            <Link href={`/s/${studyId}`}>
              <Button variant="outline" className="w-full">
                Back to dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Edit session
        </h1>
        <Link href={`/s/${studyId}`}>
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardTitle>Session details</CardTitle>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Update the passage and prompts to guide your discussion.
        </p>

        <form onSubmit={onSave} className="mt-5 grid gap-4">
          <Input
            label="Scripture passage"
            value={passageRef}
            onChange={(e) => {
              setPassageRef(e.target.value);
              setSaved(false);
            }}
            placeholder="e.g. John 1:1-18"
            disabled={saving}
          />

          <Textarea
            label="Discussion questions (one per line)"
            value={questionsText}
            onChange={(e) => {
              setQuestionsText(e.target.value);
              setSaved(false);
            }}
            placeholder={"What stands out to you?\nWhat do we learn about Jesus?\nWhere do you see this in your life?"}
            rows={7}
            disabled={saving}
          />

          <Textarea
            label="Leader notes (private)"
            value={leaderNotes}
            onChange={(e) => {
              setLeaderNotes(e.target.value);
              setSaved(false);
            }}
            placeholder="Timing notes, reminders, themes to emphasize..."
            rows={6}
            disabled={saving}
          />

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          {saved && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
              Session saved.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save session"}
            </Button>
            <Link href={`/s/${studyId}/session/${sessionId}/recap`}>
              <Button type="button" variant="secondary" disabled={saving}>
                Post recap
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </main>
  );
}
