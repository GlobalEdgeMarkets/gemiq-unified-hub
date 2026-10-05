// Client-safe shapes for end-to-end test runs.
export type E2eStatus = "started" | "running" | "pass" | "fail";
export type E2eCheck = { key: string; label: string; status: "pass" | "fail" | "pending" | "skip"; detail?: string };
export type E2eRun = {
  id: string; assessment_key: string; email: string; source: string; status: E2eStatus;
  checks: E2eCheck[]; user_id: string | null; submission_id: string | null;
  started_at: string; finished_at: string | null; cleaned_at: string | null;
};
export type E2eWorkflow = { name: string; when: "always" | "trial" };
export type E2eSettings = {
  enabled: boolean; base_email: string; keep_days: number; assessments: string[];
  workflows: E2eWorkflow[]; last_cleanup_at: string | null; updated_at: string; updated_by: string | null;
};
