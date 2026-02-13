"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getStudy } from "@/lib/services/studies";
import { listSessions, SessionDoc } from "@/lib/services/sessions";
import { Button } from "@/components/ui/Button";
import { ensureAnonymousAuth } from "@/lib/firebase/auth";
import { getMyRole } from "@/lib/services/studies";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import { PageError } from "@/components/ui/ErrorMessage";

function fmt(ts?: any) {
  if (!ts?.toDate) return "";
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
  const [role, setRole] = useState<"leader" | "participant" | null>(null);

  const nextSession = useMemo(() => {
    const now = new Date();
    return (
      sessions.find((s) => {
        const d = s.startsAt?.toDate?.();
        return d ? d >= now : false;
      }) ?? sessions[0]
    );
  }, [sessions]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const user = await ensureAnonymousAuth();
      const r = await getMyRole(studyId, user.uid);

      const s = await getStudy(studyId);
      const sess = await listSessions(studyId);

      setRole(r);
      setStudy(s);
      setSessions(sess);
      setLoading(false);
    })();
  }, [studyId]);

  if (loading) return <PageLoading />;
  if (!study) return <PageError message="Study not found." />;

  const isLeader = role === "leader";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {study.name}
        </h1>
        <div className="flex items-center gap-3">
          {isLeader && (
            <Link href={`/s/${studyId}/new`}>
              <Button size="sm">New session</Button>
            </Link>
          )}
          <Link
            href={`/created/${studyId}`}
            className="text-sm text-slate-500 hover:text-[var(--accent)] dark:text-slate-400"
          >
            Share link
          </Link>
        </div>
      </div>

      {/* Next session card */}
      {nextSession && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Next session
          </div>
          <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
            {nextSession.passage?.reference || nextSession.title || "Session"}
          </div>
          <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {fmt(nextSession.startsAt)}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {isLeader ? (
              <>
                <Link href={`/s/${studyId}/session/${nextSession.id}`}>
                  <Button size="sm">Edit session</Button>
                </Link>
                <Link href={`/s/${studyId}/session/${nextSession.id}/recap`}>
                  <Button variant="secondary" size="sm">
                    Post recap
                  </Button>
                </Link>
              </>
            ) : (
              <Link href={`/s/${studyId}/session/${nextSession.id}`}>
                <Button variant="outline" size="sm">
                  View session
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Sessions list */}
      <h2 className="mt-8 mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Sessions
      </h2>

      {sessions.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">No sessions yet.</p>
      ) : (
        <div className="grid gap-3">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {sess.passage?.reference || sess.title || "Session"}
                  </div>
                  <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {fmt(sess.startsAt)}
                  </div>
                </div>

                <div className="flex gap-3 text-sm">
                  {isLeader ? (
                    <>
                      <Link
                        href={`/s/${studyId}/session/${sess.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/s/${studyId}/session/${sess.id}/recap`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        Recap
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/s/${studyId}/session/${sess.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        View
                      </Link>
                      {sess.recap?.summary && (
                        <Link
                          href={`/s/${studyId}/session/${sess.id}/recap/view`}
                          className="text-[var(--accent)] hover:underline"
                        >
                          Recap
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Recap preview */}
              {sess.recap?.summary ? (
                <div className="mt-2.5 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Recap:</span>{" "}
                  {sess.recap.summary.slice(0, 120)}
                  {sess.recap.summary.length > 120 ? "..." : ""}
                </div>
              ) : (
                <div className="mt-2.5 text-sm text-slate-400 dark:text-slate-500">
                  No recap yet.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
