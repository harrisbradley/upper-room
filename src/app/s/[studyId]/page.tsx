"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getStudy } from "@/lib/services/studies";
import { listSessions, SessionDoc } from "@/lib/services/sessions";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ensureAnonymousAuth } from "@/lib/firebase/auth";
import { getMyRole } from "@/lib/services/studies";

type DateLike = {
  toDate?: () => Date;
} | null;

function getSessionDate(session: SessionDoc): DateLike {
  const scheduledAt = (session as SessionDoc & { scheduledAt?: DateLike }).scheduledAt;
  return scheduledAt ?? session.startsAt ?? null;
}

function fmt(ts: DateLike) {
  if (!ts?.toDate) return "Not scheduled";
  return ts.toDate().toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StudyDashboard() {
  const params = useParams<{ studyId: string }>();
  const studyId = params.studyId;

  const [study, setStudy] = useState<any>(null);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"leader" | "participant" | null>(null);

  const nextSession = useMemo(() => {
    const now = new Date();
    return (
      sessions.find((s) => {
        const d = getSessionDate(s)?.toDate?.();
        return d ? d >= now : false;
      }) ?? sessions[0] ?? null
    );
  }, [sessions]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const user = await ensureAnonymousAuth();
        const r = await getMyRole(studyId, user.uid);
        const s = await getStudy(studyId);
        const sess = await listSessions(studyId);

        setRole(r);
        setStudy(s);
        setSessions(sess);
      } catch (e: any) {
        setError(e?.message ?? "Could not load this study.");
      } finally {
        setLoading(false);
      }
    })();
  }, [studyId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardTitle className="mb-2">Could not load study</CardTitle>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <div className="mt-5">
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back home
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  if (!study) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardTitle className="mb-2">Study not found</CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            This study may have been removed or your invite link is invalid.
          </p>
          <div className="mt-5">
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back home
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {study.name || study.title || "Study"}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Plan weekly sessions and keep everyone aligned.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap gap-3">
        {role === "leader" && (
          <Link href={`/s/${studyId}/new`}>
            <Button>Create new session</Button>
          </Link>
        )}
        <Link href={`/created/${studyId}`}>
          <Button variant="outline">Share invite link</Button>
        </Link>
      </div>

      {nextSession && (
        <Card className="mt-6">
          <CardTitle className="text-lg">Next session</CardTitle>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {fmt(getSessionDate(nextSession))}
          </p>
          <p className="mt-2 text-base font-medium text-slate-800 dark:text-slate-200">
            {nextSession.passage?.reference || nextSession.title || "Session"}
          </p>

          {role === "leader" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/s/${studyId}/session/${nextSession.id}`}>
                <Button size="sm">Edit session</Button>
              </Link>

              <Link href={`/s/${studyId}/session/${nextSession.id}/recap`}>
                <Button variant="secondary" size="sm">
                  Post recap
                </Button>
              </Link>
            </div>
          )}
        </Card>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Sessions
        </h2>

        {sessions.length === 0 ? (
          <Card className="mt-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No sessions yet.
            </p>
          </Card>
        ) : (
          <div className="mt-4 grid gap-3">
            {sessions.map((sess) => (
              <Card key={sess.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {sess.passage?.reference || sess.title || "Session"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {fmt(getSessionDate(sess))}
                    </p>
                  </div>

                  {role === "leader" && (
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/s/${studyId}/session/${sess.id}`}>
                        <Button size="sm">Edit</Button>
                      </Link>
                      <Link href={`/s/${studyId}/session/${sess.id}/recap`}>
                        <Button variant="secondary" size="sm">
                          Recap
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {sess.recap?.summary ? (
                  <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">
                    <strong>Recap:</strong> {sess.recap.summary.slice(0, 140)}
                    {sess.recap.summary.length > 140 ? "…" : ""}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    No recap yet.
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}