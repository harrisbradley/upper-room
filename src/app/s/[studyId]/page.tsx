"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getStudy } from "@/lib/services/studies";
import { listSessions, SessionDoc } from "@/lib/services/sessions";
import { Button } from "@/components/ui/Button";
import { ensureAnonymousAuth } from "@/lib/firebase/auth";
import { getMyRole } from "@/lib/services/studies";


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


  if (loading) return <main>Loading...</main>;
  if (!study) return <main>Study not found.</main>;

  return (
    <main style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ fontSize: 34, margin: 0 }}>{study.title}</h1>
        {role === "leader" && (
          <Link href={`/s/${studyId}/new`}>
            <Button>Create new session</Button>
          </Link>
        )}
        <Link href={`/created/${studyId}`} style={{ color: "#444" }}>
          Share link
        </Link>
      </div>

      {nextSession && (
        <div style={{ marginTop: 12, padding: 14, border: "1px solid #ddd", borderRadius: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Next session</div>
          <div style={{ color: "#444" }}>{fmt(nextSession.startsAt)}</div>

          {role === "leader" && (
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href={`/s/${studyId}/session/${nextSession.id}`}>
                <Button>Edit session</Button>
              </Link>

              <Link href={`/s/${studyId}/session/${nextSession.id}/recap`}>
                <Button variant="secondary">Post recap</Button>
              </Link>
            </div>
          )}
        </div>
      )}

      <h2 style={{ marginTop: 22, marginBottom: 10 }}>Sessions</h2>

      {sessions.length === 0 ? (
        <div style={{ color: "#444" }}>No sessions yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {sessions.map((sess) => (
            <div key={sess.id} style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>
                    {sess.passage?.reference || sess.title || "Session"}
                  </div>
                  <div style={{ color: "#444", marginTop: 2 }}>{fmt(sess.startsAt)}</div>
                </div>

                {role === "leader" && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <Link href={`/s/${studyId}/session/${sess.id}`}>Edit</Link>
                    <Link href={`/s/${studyId}/session/${sess.id}/recap`}>Recap</Link>
                  </div>
                )}
              </div>

              {sess.recap?.summary ? (
                <div style={{ marginTop: 10, color: "#444" }}>
                  <strong>Recap:</strong>{" "}
                  {sess.recap.summary.slice(0, 120)}
                  {sess.recap.summary.length > 120 ? "…" : ""}
                </div>
              ) : (
                <div style={{ marginTop: 10, color: "#666" }}>No recap yet.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}