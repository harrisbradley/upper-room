"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession, SessionDoc } from "@/lib/services/sessions";
import { getMyRole } from "@/lib/services/studies";
import { ensureAnonymousAuth } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import { PageError } from "@/components/ui/ErrorMessage";

function fmtDate(ts?: any) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function RecapViewPage() {
  const params = useParams<{ studyId: string; sessionId: string }>();
  const { studyId, sessionId } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [role, setRole] = useState<"leader" | "participant" | null>(null);

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
          return;
        }
        if (!s.recap?.summary) {
          setError("No recap has been posted for this session yet.");
          return;
        }
        setSession(s);
      } catch (e: any) {
        setError(e?.message ?? "Could not load recap.");
      } finally {
        setLoading(false);
      }
    })();
  }, [studyId, sessionId]);

  if (loading) return <PageLoading />;
  if (error || !session) return <PageError message={error ?? "Could not load recap."} />;

  const recap = session.recap!;
  const isLeader = role === "leader";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Session Recap
        </h1>
        <Link
          href={`/s/${studyId}`}
          className="text-sm text-slate-500 hover:text-[var(--accent)] dark:text-slate-400"
        >
          Back to dashboard
        </Link>
      </div>

      {/* Session title / passage */}
      {session.passage?.reference && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {session.passage.reference}
        </p>
      )}

      {/* Summary */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Summary
        </h2>
        <p className="mt-2 whitespace-pre-line text-slate-800 dark:text-slate-200">
          {recap.summary}
        </p>
      </div>

      {/* Key Takeaways */}
      {recap.keyTakeaways && recap.keyTakeaways.length > 0 && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Key Takeaways
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-slate-800 dark:text-slate-200">
            {recap.keyTakeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Prayer Intentions */}
      {recap.prayerIntentions && recap.prayerIntentions.length > 0 && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Prayer Intentions
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-slate-800 dark:text-slate-200">
            {recap.prayerIntentions.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Posted date */}
      {recap.postedAt && (
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Posted {fmtDate(recap.postedAt)}
        </p>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/s/${studyId}/session/${sessionId}`}>
          <Button variant="secondary" size="sm">
            Back to session
          </Button>
        </Link>

        {isLeader && (
          <Link href={`/s/${studyId}/session/${sessionId}/recap`}>
            <Button size="sm">Edit recap</Button>
          </Link>
        )}
      </div>
    </main>
  );
}
