"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatRelativeDate } from "@/lib/utils/date";
import type { Study } from "@/lib/services/studies";

type StudyCardProps = {
  study: Study;
};

export function StudyCard({ study }: StudyCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function handleCopyJoinCode() {
    navigator.clipboard.writeText(study.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClick() {
    router.push(`/s/${study.id}`);
  }

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {study.name}
          </h3>
          <div className="mt-2 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-mono font-medium tracking-wider">
              {study.joinCode}
            </span>
            <span className="text-xs">
              {formatRelativeDate(study.createdAt)}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyJoinCode();
          }}
          className="shrink-0"
        >
          {copied ? (
            <>
              <svg
                className="mr-1 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg
                className="mr-1 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
