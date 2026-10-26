import { createFileRoute } from "@tanstack/react-router";

import { SummaryGetPage } from "@/components/SummaryGetPage";

export const Route = createFileRoute("/summary")({
  head: () => ({
    meta: [
      { title: "Summary get — ImbutoSmart AI" },
      {
        name: "description",
        content:
          "Your whole plan for the field you chose: the crops, the inputs farmers here use, the insurance to ask about and what else to do. Read it, download it, share it or send it by email.",
      },
    ],
  }),
  component: SummaryGetPage,
});
