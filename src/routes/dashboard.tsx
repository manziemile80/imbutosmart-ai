import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SiteShell } from "@/components/SiteShell";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Stat } from "@/components/ui/stat";
import { Callout } from "@/components/ui/callout";
import { API_URL, getStats } from "@/lib/api";
import { NISR_2026B } from "@/lib/local-model";
import { DistrictLandMap } from "@/components/DistrictLandMap";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Agronomist Dashboard — ImbutoSmart AI" },
      {
        name: "description",
        content:
          "Explore NISR agricultural statistics, Rwanda district land-use shares, and trained-model evaluation results.",
      },
      { property: "og:title", content: "Agronomist Dashboard — ImbutoSmart AI" },
      {
        property: "og:description",
        content:
          "Explore crops, pasture and fallow across Rwanda’s 30 districts alongside NISR agricultural statistics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const ACTUAL = "var(--chart-2)";
const PRED = "var(--chart-1)";

function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    retry: false,
    enabled: !!API_URL,
  });
  const n = NISR_2026B;

  return (
    <SiteShell>
      <div className="page">
        <header className="page-header">
          <div className="min-w-0">
            <p className="eyebrow">Agronomist Dashboard</p>
            <h1 className="page-title mt-2">Rwanda agriculture — Season B 2026</h1>
            <p className="page-lede">Source: NISR Seasonal Agricultural Survey.</p>
          </div>
        </header>

        <div className="page-section grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Total land" value={`${n.totalLand} M ha`} />
          <Stat label="Agricultural land" value={`${n.agriLand} M ha`} hint="59% of the country" />
          <Stat label="Irrigation" value="13.1%" hint="of farmers" />
          <Stat label="Mechanisation" value="1.8%" hint="of farmers" />
        </div>

        <div className="page-section">
          <DistrictLandMap />
        </div>

        <div className="page-section grid items-start gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Land use (million hectares)" />
            <PanelBody>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={n.land}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" name="Million ha" fill={PRED} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Farming practices (% of farmers)" />
            <PanelBody>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={n.practices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <Tooltip />
                  <Bar dataKey="value" name="% of farmers" fill={ACTUAL} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </PanelBody>
          </Panel>

          <Panel className="lg:col-span-2">
            <PanelHeader title="Farmers using each input (%)" />
            <PanelBody>
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
            </PanelBody>
          </Panel>
        </div>

        {isLoading && <p className="page-section text-muted-foreground">Loading model data…</p>}
        {!API_URL && (
          <Callout tone="info" className="page-section">
            Trained-model accuracy and yield error are unavailable until the prediction server and
            real crop-level CSV are connected.
          </Callout>
        )}
        {error && (
          <Callout tone="danger" role="alert" className="page-section">
            Unable to load trained-model results: {error.message}
          </Callout>
        )}

        {data && (
          <>
            <div className="page-section grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Training rows" value={data.metrics.rows} />
              <Stat label="Test accuracy" value={pct(data.metrics.test_accuracy)} />
              <Stat label="Yield R²" value={data.metrics.test_r2?.toFixed(2)} />
              <Stat
                label="Yield MAE"
                value={
                  data.metrics.test_mae_t_ha != null
                    ? `${data.metrics.test_mae_t_ha.toFixed(2)} t/ha`
                    : "—"
                }
              />
            </div>

            <div className="page-section grid items-start gap-6 lg:grid-cols-2">
              <Panel className="lg:col-span-2">
                <PanelHeader title="Average yield by crop (t/ha)" />
                <PanelBody>
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={data.by_crop}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="crop" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="actual"
                        name="NISR historical"
                        fill={ACTUAL}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="predicted"
                        name="AI predicted"
                        fill={PRED}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </PanelBody>
              </Panel>

              {data.by_period.length > 0 && (
                <Panel className="lg:col-span-2">
                  <PanelHeader title="Yield over time (t/ha)" />
                  <PanelBody>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.by_period}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={12} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Line
                          dataKey="actual"
                          name="NISR historical"
                          stroke={ACTUAL}
                          strokeWidth={2}
                        />
                        <Line
                          dataKey="predicted"
                          name="AI predicted"
                          stroke={PRED}
                          strokeWidth={2}
                          strokeDasharray="5 4"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </PanelBody>
                </Panel>
              )}
            </div>
          </>
        )}
      </div>
    </SiteShell>
  );
}

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
