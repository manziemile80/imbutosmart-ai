import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OverviewSection } from "@/components/agronomist/OverviewSection";
import type { SectionProps } from "@/components/agronomist/section-types";

// The overview used to print "0" for every count while the records table was
// missing, which reads as "nothing is stored" instead of "nothing could be
// read". These checks keep a zero a fact and an unread store an unknown.

afterEach(cleanup);

const base: SectionProps = {
  records: [],
  storage: "unconfigured",
  canEdit: false,
  busy: false,
  language: "en",
  save: async () => ({ ok: false, error: "failed" }),
  remove: async () => ({ ok: false, error: "failed" }),
  refresh: async () => {},
};

function renderOverview(overrides: Partial<Parameters<typeof OverviewSection>[0]> = {}) {
  return render(
    <OverviewSection
      {...base}
      district="Musanze"
      soil="Volcanic"
      season="B"
      weather={null}
      weatherLoading={false}
      stats={null}
      onOpenTab={() => {}}
      {...overrides}
    />,
  );
}

describe("overview honest counts", () => {
  it("shows an unknown figure, not a zero, when the store could not be read", () => {
    renderOverview();

    const figures = Array.from(document.querySelectorAll(".stat-value")).map(
      (node) => node.textContent,
    );
    expect(figures).toEqual(["—", "—", "—", "—", "—"]);
    expect(screen.getByText(/The five counts are not known until/)).toBeInTheDocument();
    expect(screen.queryByText("No record has been stored yet.", { exact: false })).toBeNull();
    expect(screen.getByText(/no stored change can be listed here/)).toBeInTheDocument();
  });

  it("keeps the status pill to a short label", () => {
    renderOverview();

    expect(screen.getByText("Database not configured")).toBeInTheDocument();
    expect(
      screen.queryByText(/Published figures and the reference catalogue still work/),
    ).toBeNull();
  });

  it("reports real zeros once the store has been read", () => {
    renderOverview({ storage: "ready" });

    // Four counts are zero and the risk count stays unknown while no forecast
    // is available.
    const figures = Array.from(document.querySelectorAll(".stat-value")).map(
      (node) => node.textContent,
    );
    expect(figures).toEqual(["0", "0", "0", "0", "—"]);
    expect(screen.queryByText(/The five counts are not known until/)).toBeNull();
    expect(screen.getByText("Database ready")).toBeInTheDocument();
  });
});
