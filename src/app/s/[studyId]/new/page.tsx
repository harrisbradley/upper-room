"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSession } from "@/lib/services/sessions";
import { Button } from "@/components/ui/Button";
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
    <main style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>New Session</h1>
        <Link href={`/s/${studyId}`}>Back</Link>
      </div>

      <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <input
          placeholder="Scripture passage (e.g., John 3)"
          value={passage}
          onChange={(e) => setPassage(e.target.value)}
        />

        <textarea
          placeholder="Starter questions (one per line)"
          value={questionsText}
          onChange={(e) => setQuestionsText(e.target.value)}
          style={{ minHeight: 120, padding: 12 }}
        />

        {error && <div style={{ color: "red" }}>{error}</div>}

        <Button onClick={onCreate} disabled={saving}>
          {saving ? "Creating..." : "Create session"}
        </Button>
      </div>
    </main>
  );
}