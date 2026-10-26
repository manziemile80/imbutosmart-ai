import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import {
  deleteAgronomistRecord,
  listAgronomistRecords,
  saveAgronomistRecord,
} from "@/lib/agronomist-dashboard.functions";
import {
  parseRecordData,
  type AgronomistRecord,
  type RecordData,
  type RecordKind,
  type RecordList,
  type SaveResult,
} from "@/lib/agronomist-dashboard";

// The dashboard's record store. A successful read is cached for the visit and
// for a later offline visit; a change made while the connection is down is kept
// in a small retry queue and sent when the page next loads or refreshes online.

const CACHE_KEY = "imbutosmart-agronomist-records-v1";
const QUEUE_KEY = "imbutosmart-agronomist-queue-v1";

type Cached = { records: AgronomistRecord[]; savedAt: string };

type Queued =
  | {
      id: string;
      action: "save";
      kind: RecordKind;
      recordId: string | null;
      data: unknown;
      queuedAt: string;
    }
  | { id: string; action: "delete"; recordId: string; queuedAt: string };

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A browser that blocks storage still keeps the data for this visit.
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function readQueue(): Queued[] {
  return readJson<Queued[]>(QUEUE_KEY) ?? [];
}

function writeQueue(queue: Queued[]) {
  writeJson(QUEUE_KEY, queue);
}

function queuedFailure(caught: unknown): SaveResult & { queued: true } {
  const message = caught instanceof Error ? caught.message : null;
  return message
    ? { ok: false, error: "failed", queued: true, message }
    : { ok: false, error: "failed", queued: true };
}

export type AgronomistRecords = RecordList & {
  pending: number;
  busy: boolean;
  lastSavedAt: string | null;
  notice: string | null;
  refresh: () => Promise<void>;
  save: (
    kind: RecordKind,
    data: unknown,
    id?: string | null,
  ) => Promise<SaveResult & { queued?: boolean }>;
  remove: (id: string) => Promise<SaveResult>;
};

export function useAgronomistRecords(): AgronomistRecords {
  const list = useServerFn(listAgronomistRecords);
  const saveRemote = useServerFn(saveAgronomistRecord);
  const deleteRemote = useServerFn(deleteAgronomistRecord);

  const [state, setState] = useState<RecordList>({ storage: "loading", records: [] });
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const flushing = useRef(false);

  const remember = useCallback((records: AgronomistRecord[]) => {
    const savedAt = new Date().toISOString();
    writeJson(CACHE_KEY, { records, savedAt } satisfies Cached);
    setLastSavedAt(savedAt);
  }, []);

  // An edit made offline is shown from the local copy straight away, so the
  // agronomist can see what they wrote. A new record cannot be given a server id
  // yet, so it stays in the queue and appears after the server accepts it.
  const applyLocalEdit = useCallback(
    (kind: RecordKind, data: unknown, id: string) => {
      const parsed = parseRecordData(kind, data);
      if (!parsed.success) return;
      const now = new Date().toISOString();
      setState((current) => {
        const records = current.records.map((record) =>
          record.id === id
            ? {
                ...record,
                data: parsed.data as RecordData,
                updatedAt: now,
                updatedByName: "Saved on this device",
              }
            : record,
        );
        remember(records);
        return { ...current, records };
      });
    },
    [remember],
  );

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      let queue = readQueue();
      while (queue.length > 0) {
        const item = queue[0];
        if (!item) break;
        let remove = false;
        try {
          if (item.action === "save") {
            const result = await saveRemote({
              data: { kind: item.kind, id: item.recordId, data: item.data },
            });
            remove = result.ok || result.error === "invalid";
          } else {
            const result = await deleteRemote({ data: { id: item.recordId } });
            remove = result.ok || result.error === "invalid";
          }
        } catch {
          remove = false;
        }
        if (!remove) break;
        queue = queue.slice(1);
        writeQueue(queue);
      }
      setPending(queue.length);
    } finally {
      flushing.current = false;
    }
  }, [deleteRemote, saveRemote]);

  const refresh = useCallback(async () => {
    await flush();
    setBusy(true);
    try {
      const result = await list();
      if (result.storage === "ready") {
        setState(result);
        remember(result.records);
        setNotice(null);
      } else {
        const cached = readJson<Cached>(CACHE_KEY);
        setState({
          ...result,
          records: cached?.records ?? [],
        });
        if (cached) {
          setNotice(
            `Showing the copy saved on ${new Date(cached.savedAt).toLocaleString("en-GB")}.`,
          );
        }
      }
    } catch (caught) {
      const cached = readJson<Cached>(CACHE_KEY);
      setState({
        storage: "error",
        records: cached?.records ?? [],
        message: caught instanceof Error ? caught.message : "The records could not be loaded.",
      });
      if (cached) {
        setNotice(`Showing the copy saved on ${new Date(cached.savedAt).toLocaleString("en-GB")}.`);
      }
    } finally {
      setBusy(false);
      setPending(readQueue().length);
    }
  }, [flush, list, remember]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (kind: RecordKind, data: unknown, id?: string | null) => {
      setBusy(true);
      setNotice(null);
      try {
        const result = await saveRemote({ data: { kind, id: id ?? null, data } });
        const saved = result.record;
        if (result.ok && saved) {
          setState((current) => {
            const rest = current.records.filter((record) => record.id !== saved.id);
            const records = [saved, ...rest];
            remember(records);
            return { ...current, storage: "ready", records };
          });
          return result;
        }
        if (result.error === "failed") {
          const queue = readQueue();
          queue.push({
            id: newId(),
            action: "save",
            kind,
            recordId: id ?? null,
            data,
            queuedAt: new Date().toISOString(),
          });
          writeQueue(queue);
          setPending(queue.length);
          if (id) applyLocalEdit(kind, data, id);
          return { ...result, queued: true };
        }
        return result;
      } catch (caught) {
        const queue = readQueue();
        queue.push({
          id: newId(),
          action: "save",
          kind,
          recordId: id ?? null,
          data,
          queuedAt: new Date().toISOString(),
        });
        writeQueue(queue);
        setPending(queue.length);
        if (id) applyLocalEdit(kind, data, id);
        return queuedFailure(caught);
      } finally {
        setBusy(false);
      }
    },
    [applyLocalEdit, remember, saveRemote],
  );

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      setNotice(null);
      try {
        const result = await deleteRemote({ data: { id } });
        if (result.ok) {
          setState((current) => {
            const records = current.records.filter((record) => record.id !== id);
            remember(records);
            return { ...current, records };
          });
          return result;
        }
        if (result.error === "failed") {
          const queue = readQueue();
          queue.push({
            id: newId(),
            action: "delete",
            recordId: id,
            queuedAt: new Date().toISOString(),
          });
          writeQueue(queue);
          setPending(queue.length);
          setState((current) => {
            const records = current.records.filter((record) => record.id !== id);
            remember(records);
            return { ...current, records };
          });
          return { ...result, queued: true };
        }
        return result;
      } catch (caught) {
        const queue = readQueue();
        queue.push({
          id: newId(),
          action: "delete",
          recordId: id,
          queuedAt: new Date().toISOString(),
        });
        writeQueue(queue);
        setPending(queue.length);
        setState((current) => {
          const records = current.records.filter((record) => record.id !== id);
          remember(records);
          return { ...current, records };
        });
        return queuedFailure(caught);
      } finally {
        setBusy(false);
      }
    },
    [deleteRemote, remember],
  );

  return {
    ...state,
    pending,
    busy,
    lastSavedAt,
    notice,
    refresh,
    save,
    remove,
  };
}
