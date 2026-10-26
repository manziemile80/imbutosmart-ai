import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AgronomistDashboard } from "@/components/agronomist/AgronomistDashboard";
import { API_URL, getStats } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Agronomist Dashboard — ImbutoSmart AI" },
      {
        name: "description",
        content:
          "An agricultural advisory workspace for Rwanda: farmer records, input prices with sources, crop advice review, soil, weather, pest, insurance and follow-up tools.",
      },
      { property: "og:title", content: "Agronomist Dashboard — ImbutoSmart AI" },
      {
        property: "og:description",
        content:
          "Review crop advice, record verified input prices and follow up with farmers across Rwanda's districts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  // The trained-model report is shown with its own metrics. It is optional: a
  // deployment without the prediction server still shows the survey figures and
  // the whole advisory workspace.
  const { data } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    retry: false,
    enabled: !!API_URL,
  });

  return <AgronomistDashboard stats={data ?? null} />;
}
