"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession, updateSessionBasics, SessionDoc } from "@/lib/services/sessions";
import { getMyRole } from "@/lib/services/studies";
import { ensureAnonymousAuth } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import { ErrorMessage, PageError } from "@/components/ui/ErrorMessage";

export default function SessionPage() {
  const params = useParams<{ studyId: string; sessionId: string }>();
  const { studyId, sessionId } = params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [role, setRole] = useState<"leader" | "participant" | null>(null);
  const [session, setSession] = useState<SessionDoc | null>(null);

  // Edit-mode state (leader only)
  const [sessionDate, setSessionDate] = useState("");
  const [passageRef, setPassageRef] = useState("");
  const [questionsText, setQuestionsText] = useState("");
  const [leaderNotes, setLeaderNotes] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const user = await ensureAnonymousAuth();
        const r = await getMyRole(studyId, user.uid);
        setRole(r);

        const s = await getSession(studyId, sessionId);
        if (!s) {
          setError("Session not found.");
          setLoading(false);
          return;
        }

        setSession(s);
        // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
        if (s.startsAt?.toDate) {
          const d = s.startsAt.toDate();
          const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setSessionDate(iso);
        }
        setPassageRef(s.passage?.reference ?? "");
        setQuestionsText((s.agenda?.questions ?? []).join("\n"));
        setLeaderNotes(s.agenda?.leaderNotes ?? "");
      } catch (e: any) {
        setError(e?.message ?? "Could not load session.");
      } finally {
        setLoading(false);
      }
    })();
  }, [studyId, sessionId]);

  async function onSave() {
    setError(null);
    setSaving(true);
    setSaveSuccess(false);
    try {
      const questions = questionsText
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean);

      const startsAt = sessionDate ? new Date(sessionDate) : null;

      await updateSessionBasics(studyId, sessionId, {
        passageRef: passageRef.trim(),
        questions,
        leaderNotes,
        startsAt,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e: any) {
      setError(e?.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading />;
  if (error && !session) return <PageError message={error} />;

  const isLeader = role === "leader";

  // --- PARTICIPANT READ-ONLY VIEW ---
  if (!isLeader) {
    const questions = session?.agenda?.questions ?? [];
    const passage = session?.passage?.reference;
    const hasRecap = !!session?.recap?.summary;

    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {session?.title || "Session"}
          </h1>
          <Link
            href={`/s/${studyId}`}
            className="text-sm text-slate-500 hover:text-[var(--accent)] dark:text-slate-400"
          >
            Back to dashboard
          </Link>
        </div>

        {passage && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Scripture Passage
            </h2>
            <p className="mt-2 text-lg font-medium text-slate-900 dark:text-slate-100">
              {passage}
            </p>
          </div>
        )}

        {questions.length > 0 && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Discussion Questions
            </h2>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-slate-800 dark:text-slate-200">
              {questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </div>
        )}

        {!passage && questions.length === 0 && (
          <p className="mt-6 text-slate-500 dark:text-slate-400">
            The leader hasn&apos;t added session details yet. Check back soon.
          </p>
        )}

        {hasRecap && (
          <div className="mt-5">
            <Link href={`/s/${studyId}/session/${sessionId}/recap/view`}>
              <Button variant="secondary" size="sm">
                View session recap
              </Button>
            </Link>
          </div>
        )}
      </main>
    );
  }

  // --- LEADER EDIT VIEW ---
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Edit Session
        </h1>
        <Link
          href={`/s/${studyId}`}
          className="text-sm text-slate-500 hover:text-[var(--accent)] dark:text-slate-400"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="mt-6 grid gap-5">
        <div className="w-full">
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Date &amp; time
          </label>
          <input
            type="datetime-local"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <Input
          label="Scripture passage"
          value={passageRef}
          onChange={(e) => setPassageRef(e.target.value)}
          placeholder="e.g., John 1:1-18"
        />

        <Textarea
          label="Discussion questions (one per line)"
          value={questionsText}
          onChange={(e) => setQuestionsText(e.target.value)}
          placeholder={"What stands out to you?\nWhat do we learn about Jesus?\nHow can we apply this this week?"}
          className="min-h-[160px]"
        />

        <Textarea
          label="Leader notes (private)"
          value={leaderNotes}
          onChange={(e) => setLeaderNotes(e.target.value)}
          placeholder="Timing notes, reminders, themes to emphasize..."
          className="min-h-[140px]"
        />

        {error && <ErrorMessage title="Oops">{error}</ErrorMessage>}

        {saveSuccess && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            Session saved successfully.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save session"}
          </Button>

          <Link href={`/s/${studyId}/session/${sessionId}/recap`}>
            <Button variant="secondary">Post recap</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
