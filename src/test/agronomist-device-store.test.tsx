import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAgronomistRecords } from "@/hooks/use-agronomist-records";

// The deployed dashboard used to refuse every change while its table was
// missing. These checks keep the browser fallback honest: a missing table leads
// to a device store, a save is written there, and the record is read back on the
// next visit without pretending a database row exists.

const server = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/agronomist-dashboard.functions", () => ({
  listAgronomistRecords: server.list,
  saveAgronomistRecord: server.save,
  deleteAgronomistRecord: server.remove,
}));

const DEVICE_KEY = "imbutosmart-agronomist-device-v1";

function deviceHook() {
  return renderHook(() => useAgronomistRecords("device-reviewer", "Shared reviewer account"));
}

beforeEach(() => {
  window.localStorage.clear();
  server.list.mockReset();
  server.save.mockReset();
  server.remove.mockReset();
});

describe("records on this device", () => {
  it("falls back to the browser when the server has no records table", async () => {
    server.list.mockResolvedValue({ storage: "unconfigured", records: [] });

    const { result } = deviceHook();
    await waitFor(() => expect(result.current.storage).toBe("device"));
    expect(result.current.records).toEqual([]);

    await act(async () => {
      const saved = await result.current.save("product", {
        category: "fertilizer",
        name: "Urea",
      });
      expect(saved.ok).toBe(true);
    });

    await waitFor(() => expect(result.current.records).toHaveLength(1));
    const saved = result.current.records[0];
    expect(saved?.id.startsWith("device-")).toBe(true);
    expect(saved?.data["name"]).toBe("Urea");
    expect(saved?.updatedByName).toBe("Shared reviewer account");
    expect(result.current.storage).toBe("device");
    // A device save must not call a server that already said it has no table.
    expect(server.save).not.toHaveBeenCalled();

    const stored = JSON.parse(window.localStorage.getItem(DEVICE_KEY) ?? "[]");
    expect(stored).toHaveLength(1);
  });

  it("edits and deletes the same browser record", async () => {
    server.list.mockResolvedValue({ storage: "unconfigured", records: [] });

    const { result } = deviceHook();
    await waitFor(() => expect(result.current.storage).toBe("device"));

    let id = "";
    await act(async () => {
      const saved = await result.current.save("farmer", {
        fullName: "Jean",
        district: "Musanze",
        soil: "Volcanic",
      });
      id = saved.record?.id ?? "";
    });

    await act(async () => {
      await result.current.save(
        "farmer",
        { fullName: "Jean", district: "Musanze", soil: "Volcanic", crops: "Maize" },
        id,
      );
    });

    await waitFor(() => expect(result.current.records).toHaveLength(1));
    expect(result.current.records[0]?.data["crops"]).toBe("Maize");

    await act(async () => {
      const removed = await result.current.remove(id);
      expect(removed.ok).toBe(true);
    });

    await waitFor(() => expect(result.current.records).toHaveLength(0));
    expect(server.remove).not.toHaveBeenCalled();
  });

  it("reads the device store back on the next visit", async () => {
    server.list.mockResolvedValue({ storage: "unconfigured", records: [] });
    window.localStorage.setItem(
      DEVICE_KEY,
      JSON.stringify([
        {
          id: "device-existing",
          kind: "product",
          data: { category: "manure", name: "Compost" },
          createdBy: "device-reviewer",
          createdByName: "Shared reviewer account",
          updatedBy: "device-reviewer",
          updatedByName: "Shared reviewer account",
          createdAt: "2026-10-26T10:00:00.000Z",
          updatedAt: "2026-10-26T10:00:00.000Z",
        },
      ]),
    );

    const { result } = deviceHook();
    await waitFor(() => expect(result.current.storage).toBe("device"));
    expect(result.current.records).toHaveLength(1);
    expect(result.current.records[0]?.data["name"]).toBe("Compost");
  });

  it("reloads the records when an agronomist signs in", async () => {
    // A visitor's request returns only the public catalogue: no farmer records.
    server.list.mockResolvedValueOnce({ storage: "ready", records: [] });
    // The signed-in request returns the farmer profiles the account may read.
    server.list.mockResolvedValue({
      storage: "ready",
      records: [
        {
          id: "farmer-1",
          kind: "farmer",
          data: { fullName: "Alice Mukamana", district: "Nyagatare", soil: "Sandy" },
          createdBy: null,
          createdByName: "Sample data",
          updatedBy: null,
          updatedByName: "Sample data",
          createdAt: "2026-10-20T08:00:00.000Z",
          updatedAt: "2026-10-20T08:00:00.000Z",
        },
      ],
    });

    const { result, rerender } = renderHook(
      ({ id, name }: { id: string | null; name: string | null }) =>
        useAgronomistRecords(id, name),
      { initialProps: { id: null as string | null, name: null as string | null } },
    );

    await waitFor(() => expect(result.current.storage).toBe("ready"));
    expect(result.current.records).toHaveLength(0);

    rerender({ id: "8ad9c790-f121-41b6-8db0-b0f2074161c5", name: "manziemile1@gmail.com" });

    await waitFor(() => expect(result.current.records).toHaveLength(1));
    expect(result.current.records[0]?.data["fullName"]).toBe("Alice Mukamana");
    expect(server.list).toHaveBeenCalledTimes(2);
  });
});
