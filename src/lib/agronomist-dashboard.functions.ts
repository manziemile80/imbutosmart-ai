import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  RECORD_KINDS,
  type RecordKind,
  type RecordList,
  type SaveResult,
} from "./agronomist-dashboard";

// Server functions for the agronomist dashboard. The browser sends the kind and
// the record data; the server checks the schema and the signed-in role before
// touching the database. Reads are allowed for reference records so the page can
// show the catalogue before anyone signs in; the database's policies decide
// which rows an anonymous visitor may see.

const saveInputSchema = z.object({
  kind: z.enum(RECORD_KINDS),
  id: z.string().uuid().nullable().optional(),
  data: z.unknown(),
});

const deleteInputSchema = z.object({
  id: z.string().uuid(),
});

export const listAgronomistRecords = createServerFn({ method: "GET" }).handler(
  async (): Promise<RecordList> => {
    const { listRecords } = await import("./agronomist-dashboard.server");
    return listRecords();
  },
);

export const saveAgronomistRecord = createServerFn({ method: "POST" })
  .validator((input: unknown) => saveInputSchema.parse(input))
  .handler(async ({ data }): Promise<SaveResult> => {
    const { saveRecord } = await import("./agronomist-dashboard.server");
    return saveRecord(data.kind as RecordKind, data.data, data.id ?? null);
  });

export const deleteAgronomistRecord = createServerFn({ method: "POST" })
  .validator((input: unknown) => deleteInputSchema.parse(input))
  .handler(async ({ data }): Promise<SaveResult> => {
    const { deleteRecord } = await import("./agronomist-dashboard.server");
    return deleteRecord(data.id);
  });

export const getAgronomistIdentity = createServerFn({ method: "GET" }).handler(async () => {
  const { currentIdentity } = await import("./agronomist-dashboard.server");
  return currentIdentity();
});
