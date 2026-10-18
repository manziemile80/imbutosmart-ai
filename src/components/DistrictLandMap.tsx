import { useRef, useState } from "react";
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DISTRICTS } from "@/lib/api";
import { districtGeometry as boundaries } from "@/lib/district-geometry";
import { LAND_CATEGORIES, landShare, parseDistrictLand, type DistrictLand, type LandCategory } from "@/lib/district-land";

const projection = geoMercator().fitExtent([[20, 20], [580, 470]], boundaries as unknown as GeoPermissibleObjects);
const path = geoPath(projection);
const formatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

export function DistrictLandMap() {
  const [district, setDistrict] = useState("Musanze");
  const [category, setCategory] = useState<LandCategory>("crops_ha");
  const [rows, setRows] = useState<DistrictLand[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const selected = rows.find((row) => row.district === district);
  const activeCategory = LAND_CATEGORIES.find((item) => item.key === category);

  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      const data = parseDistrictLand(await file.text());
      setRows(data);
      setFileName(file.name);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to read the district CSV.");
    }
    if (input.current) input.current.value = "";
  }

  return (
    <section aria-labelledby="district-land-title" className="mt-10 border-y border-border py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">District land allocation</p>
          <h2 id="district-land-title" className="mt-2 font-display text-2xl">Crops, pasture & fallow</h2>
          <p className="mt-2 text-sm text-muted-foreground">{rows.length ? `${rows.length} of 30 districts · ${fileName} · Current session` : "District land-use figures not supplied. National totals cannot be used as district estimates."}</p>
        </div>
        <input ref={input} type="file" accept=".csv,text/csv" aria-label="District land-use CSV" className="hidden" onChange={(event) => void importFile(event.target.files?.[0])} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => input.current?.click()}><Upload />Import land-use CSV</Button>
          {rows.length > 0 && <Button variant="ghost" size="icon" aria-label="Clear imported land-use data" title="Clear imported data" onClick={() => { setRows([]); setFileName(""); setError(""); }}><X /></Button>}
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(240px,1fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2" aria-label="Land category">
            {LAND_CATEGORIES.map((item) => <Button key={item.key} size="sm" variant={category === item.key ? "default" : "outline"} aria-pressed={category === item.key} onClick={() => setCategory(item.key)}>{item.label}</Button>)}
          </div>
          <svg viewBox="0 0 600 490" className="mt-3 block w-full" role="group" aria-label={`Rwanda district map: ${activeCategory?.label} land share`}>
            {boundaries.features.map((feature) => {
              const name = feature.properties.shapeName;
              const row = rows.find((r) => r.district === name);
              const share = row ? landShare(row, category) : null;
              return <path key={name} d={path(feature as unknown as GeoPermissibleObjects) ?? ""} fill={share === null ? "var(--muted)" : activeCategory?.color} fillOpacity={share === null ? 1 : 0.2 + share * 0.8} stroke={district === name ? "var(--foreground)" : "var(--card)"} strokeWidth={district === name ? 2.5 : 1.3} role="button" tabIndex={0} aria-label={`${name}: ${share === null ? "data unavailable" : `${(share * 100).toFixed(1)}% ${activeCategory?.label}`}`} aria-pressed={district === name} className="cursor-pointer outline-none focus:stroke-ring focus:stroke-[3]" onClick={() => setDistrict(name)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setDistrict(name); } }}><title>{name} · {share === null ? "No data" : `${(share * 100).toFixed(1)}%`}</title></path>;
            })}
          </svg>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-3 border border-border bg-muted" />No data</span><span>Color intensity: 0–100% of reported land</span></div>
          <p className="mt-3 text-xs text-muted-foreground">Boundaries: <a className="underline" href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">geoBoundaries / Open Data Rwanda</a> · CC BY 4.0. Not a cadastral map.</p>
        </div>
        <div className="min-w-0 border-t border-border pt-5 md:border-t-0 md:border-l md:pl-6 md:pt-0">
          <label className="grid gap-2 text-sm font-medium">District<select className="field" value={district} onChange={(event) => setDistrict(event.target.value)}>{DISTRICTS.map((name) => <option key={name}>{name}</option>)}</select></label>
          <h3 className="mt-6 font-display text-2xl">{district}</h3>
          <dl className="mt-4 divide-y divide-border">
            {LAND_CATEGORIES.map((item) => {
              const share = selected ? landShare(selected, item.key) : null;
              return <div key={item.key} className="flex justify-between gap-4 py-4"><dt>{item.label}</dt><dd className="text-right"><p className="font-semibold">{selected ? `${formatter.format(selected[item.key])} ha` : "Not available"}</p><p className="text-xs text-muted-foreground">{share === null ? "—" : `${(share * 100).toFixed(1)}%`}</p></dd></div>;
            })}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Shares cover crops + pasture + fallow only, not the district’s entire area. Import non-overlapping aggregate hectares; crop-level training observations are a separate dataset.</p>
          <p className="mt-4 break-words font-mono text-xs text-muted-foreground">CSV: district,crops_ha,pasture_ha,fallow_ha</p>
        </div>
      </div>
    </section>
  );
}