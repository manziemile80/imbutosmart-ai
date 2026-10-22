import { createFileRoute } from "@tanstack/react-router";

import { Guidance } from "@/components/GuidancePage";

export const Route = createFileRoute("/guidance")({
  head: () => ({
    meta: [
      { title: "Guidance — ImbutoSmart AI" },
      {
        name: "description",
        content:
          "Every way ImbutoSmart AI can help: ask a question, speak it, read the season, or get a plan for your field.",
      },
    ],
  }),
  component: Guidance,
});
