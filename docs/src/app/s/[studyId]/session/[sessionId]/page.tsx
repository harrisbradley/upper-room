"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession, updateSessionBasics } from "@/lib/services/sessions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SessionEditPage() {
  const params = useParams<{ studyId: string; sessionId: string }>();
  const { studyId, sessionId } = params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [passageRef, setPassageRef] = useState("");
  const [questionsText, setQuestionsText] = useState(""); // one per line
  const [leaderNotes, setLeaderNotes] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const s = await getSession(studyId, sessionId);
        if (!s) {
          setError("Session not found.");
          setLoading(false);
          return;
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
    } catch (e: any) {
      setError(e?.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main>Loading...</main>;
  if (error) return <main style={{ maxWidth: 760 }}>{error}</main>;

  return (
    <main style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>Edit Session</h1>
        <Link href={`/s/${studyId}`} style={{ color: "#444" }}>
          Back to dashboard
        </Link>
      </div>

      <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
        <div>
          <label style={{ fontWeight: 800 }}>Scripture passage</label>
          <div style={{ marginTop: 6 }}>
            <Input
              value={passageRef}
              onChange={(e) => setPassageRef(e.target.value)}
              placeholder="e.g., John 1:1–18"
            />
          </div>
        </div>

        <div>
          <label style={{ fontWeight: 800 }}>Discussion questions (one per line)</label>
          <div style={{ marginTop: 6 }}>
            <textarea
              value={questionsText}
              onChange={(e) => setQuestionsText(e.target.value)}
              placeholder={"What stands out to you?\nWhat do we learn about Jesus?\nHow can we apply this this week?"}
              style={{
                width: "100%",
                minHeight: 160,
                borderRadius: 14,
                border: "1px solid #ccc",
                padding: 12,
                outline: "none",
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontWeight: 800 }}>Leader notes (private)</label>
          <div style={{ marginTop: 6 }}>
            <textarea
              value={leaderNotes}
              onChange={(e) => setLeaderNotes(e.target.value)}
              placeholder="Timing notes, themes to emphasize, reminders…"
              style={{
                width: "100%",
                minHeight: 140,
                borderRadius: 14,
                border: "1px solid #ccc",
                padding: 12,
                outline: "none",
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fecaca", padding: 12, borderRadius: 12 }}>
            <strong>Oops:</strong> {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
