import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { RecordManager, type FieldDef } from "@/components/agronomist/RecordManager";
import type { RecordKind, SaveResult } from "@/lib/agronomist-dashboard";

afterEach(cleanup);

const FIELDS: FieldDef[] = [
  {
    name: "category",
    label: "Category",
    type: "select",
    required: true,
    options: [
      { value: "manure", label: "Manure" },
      { value: "fertilizer", label: "Fertiliser" },
    ],
  },
  { name: "name", label: "Product name", required: true },
  {
    name: "quantityUnit",
    label: "Quantity unit",
    type: "select",
    options: [
      { value: "kg", label: "kg" },
      { value: "bag", label: "bag" },
    ],
  },
];

it("sends null, not an empty string, when an optional drop-down is left empty", async () => {
  const save = vi.fn(
    async (_kind: RecordKind, _data: unknown, _id?: string | null): Promise<SaveResult> => ({
      ok: true,
    }),
  );
  render(
    <RecordManager
      kind="product"
      fields={FIELDS}
      records={[]}
      storage="ready"
      canEdit
      busy={false}
      save={save}
      remove={async () => ({ ok: true })}
      renderRecord={() => null}
      formTitle="Add or update a product"
      listTitle="Recorded products"
      empty="No product yet."
      language="en"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  fireEvent.change(screen.getByLabelText(/Product name/), { target: { value: "Urea" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0]?.[1]).toMatchObject({ name: "Urea", quantityUnit: null });
});
