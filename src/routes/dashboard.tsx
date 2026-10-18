import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SiteShell } from "@/components/SiteShell";
import { API_URL, getStats } from "@/lib/api";
import { NISR_2026B } from "@/lib/local-model";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Agronomist Dashboard — SowSmart Rwanda" },
      { name: "description", content: "Historical NISR yields compared with SowSmart AI predictions." },
      { property: "og:title", content: "Agronomist Dashboard — SowSmart Rwanda" },
      { property: "og:description", content: "Compare historical NISR crop yields with model predictions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const ACTUAL = "var(--chart-2)";
const PRED = "var(--chart-1)";

function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["stats"], queryFn: getStats, retry: false, enabled: !!API_URL });
  const n = NISR_2026B;

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-5 py-10">
        <p className="eyebrow">Agronomist Dashboard</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Rwanda agriculture — Season B 2026</h1>
        <p className="mt-2 text-sm text-muted-foreground">Source: NISR Seasonal Agricultural Survey.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Metric label="Total land" value={`${n.totalLand} M ha`} />
          <Metric label="Agricultural land" value={`${n.agriLand} M ha (59%)`} />
          <Metric label="Irrigation" value="13.1% of farmers" />
          <Metric label="Mechanisation" value="1.8% of farmers" />
        </div>

        <Panel title="Land use (million hectares)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={n.land}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" name="Million ha" fill={PRED} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Farmers using each input (%)">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={n.inputs}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="small" name="Small-scale" fill={ACTUAL} radius={[4, 4, 0, 0]} />
              <Bar dataKey="large" name="Large-scale" fill={PRED} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Farming practices (% of farmers)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={n.practices} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis type="category" dataKey="name" width={110} stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" name="% of farmers" fill={ACTUAL} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {isLoading && <p className="mt-8 text-muted-foreground">Loading model data…</p>}

        {data && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Metric label="Training rows" value={data.metrics.rows} />
              <Metric label="Test accuracy" value={pct(data.metrics.test_accuracy)} />
              <Metric label="Yield R²" value={data.metrics.test_r2?.toFixed(2)} />
              <Metric label="Yield MAE" value={data.metrics.test_mae_t_ha != null ? `${data.metrics.test_mae_t_ha.toFixed(2)} t/ha` : "—"} />
            </div>

            <Panel title="Average yield by crop (t/ha)">
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={data.by_crop}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="crop" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="actual" name="NISR historical" fill={ACTUAL} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="predicted" name="AI predicted" fill={PRED} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            {data.by_period.length > 0 && (
              <Panel title="Yield over time (t/ha)">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.by_period}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line dataKey="actual" name="NISR historical" stroke={ACTUAL} strokeWidth={2} />
                    <Line dataKey="predicted" name="AI predicted" stroke={PRED} strokeWidth={2} strokeDasharray="5 4" />
                  </LineChart>
                </ResponsiveContainer>
              </Panel>
            )}
          </>
        )}
      </section>
    </SiteShell>
  );
}

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-card-foreground">{String(value ?? "—")}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 font-medium text-card-foreground">{title}</h2>
      {children}
    </div>
  );
}
