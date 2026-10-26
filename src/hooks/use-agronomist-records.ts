import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import {
  deleteAgronomistRecord,
  listAgronomistRecords,
  saveAgronomistRecord,
} from "@/lib/agronomist-dashboard.functions";
import {
  deviceRecord,
  isDeviceRecordId,
  parseRecordData,
  type AgronomistRecord,
  type RecordAuthor,
  type RecordKind,
  type RecordList,
  type SaveResult,
} from "@/lib/agronomist-dashboard";

// The dashboard's record store. A deployment with a shared database reads and
// writes there, caching a copy for a later offline visit and queueing a change
// made while the connection is down. A deployment without one falls back to a
// store in this browser: the same schemas validate the record, the page still
// says who wrote it, and the records stay on this device instead of the page
// refusing every change.

const CACHE_KEY = "imbutosmart-agronomist-records-v1";
const QUEUE_KEY = "imbutosmart-agronomist-queue-v1";
const DEVICE_KEY = "imbutosmart-agronomist-device-v1";

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

function newestFirst(records: AgronomistRecord[]): AgronomistRecord[] {
  return [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function readDevice(): AgronomistRecord[] {
  const stored = readJson<AgronomistRecord[]>(DEVICE_KEY);
  if (!Array.isArray(stored)) return [];
  return newestFirst(
    stored.filter(
      (record) =>
        record &&
        typeof record.id === "string" &&
        isDeviceRecordId(record.id) &&
        typeof record.kind === "string" &&
        record.data &&
        typeof record.data === "object",
    ),
  );
}

function writeDevice(records: AgronomistRecord[]) {
  writeJson(DEVICE_KEY, newestFirst(records));
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
  /** Remove the offline copy of the records, keeping any change waiting to sync. */
  clearCache: () => { ok: boolean; pending: number };
};

export function useAgronomistRecords(
  authorId: string | null = null,
  authorName: string | null = null,
): AgronomistRecords {
  const list = useServerFn(listAgronomistRecords);
  const saveRemote = useServerFn(saveAgronomistRecord);
  const deleteRemote = useServerFn(deleteAgronomistRecord);

  const [state, setState] = useState<RecordList>({ storage: "loading", records: [] });
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const flushing = useRef(false);
  // True once the server has said it has no shared records database. Writes then
  // go to this browser rather than failing on a table that does not exist.
  const deviceMode = useRef(false);
  // The identity that signs a device record. The page passes the signed-in
  // reviewer, so the record keeps a name after a reload.
  const author = useRef<RecordAuthor>({ id: authorId, name: authorName });

  useEffect(() => {
    author.current = { id: authorId, name: authorName };
  }, [authorId, authorName]);

  const remember = useCallback((records: AgronomistRecord[]) => {
    const savedAt = new Date().toISOString();
    writeJson(CACHE_KEY, { records, savedAt } satisfies Cached);
    setLastSavedAt(savedAt);
  }, []);

  const rememberDevice = useCallback((records: AgronomistRecord[]) => {
    writeDevice(records);
    const newest = newestFirst(records)[0]?.updatedAt ?? null;
    setLastSavedAt(newest ?? new Date().toISOString());
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
                data: parsed.data as AgronomistRecord["data"],
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

  // Removing the saved copy must not throw away a change that has not reached
  // the server yet, so the retry queue is kept and its size is reported back.
  const clearCache = useCallback(() => {
    if (typeof window === "undefined") return { ok: false, pending: 0 };
    try {
      window.localStorage.removeItem(CACHE_KEY);
      const waiting = readQueue().length;
      setLastSavedAt(null);
      setPending(waiting);
      return { ok: true, pending: waiting };
    } catch {
      return { ok: false, pending: readQueue().length };
    }
  }, []);

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

  const loadDeviceStore = useCallback(() => {
    deviceMode.current = true;
    const records = readDevice();
    setState({ storage: "device", records });
    setNotice(null);
    rememberDevice(records);
    return records;
  }, [rememberDevice]);

  const saveOnDevice = useCallback(
    (kind: RecordKind, data: unknown, id?: string | null): SaveResult => {
      const parsed = parseRecordData(kind, data);
      if (!parsed.success) {
        return {
          ok: false,
          error: "invalid",
          message: parsed.error.issues[0]?.message ?? "Check the record details.",
        };
      }
      const records = readDevice();
      // A server row id is never reused as a device id: an edit that arrives
      // before the fallback was noticed becomes its own local record instead of
      // claiming to update a row this browser does not hold.
      const existing = id && isDeviceRecordId(id) ? records.find((r) => r.id === id) : null;
      const record = deviceRecord(kind, parsed.data, author.current, existing ?? null);
      if (!record) {
        return { ok: false, error: "invalid", message: "Check the record details." };
      }
      const next = [record, ...records.filter((item) => item.id !== record.id)];
      deviceMode.current = true;
      setState({ storage: "device", records: newestFirst(next) });
      rememberDevice(next);
      return { ok: true, record };
    },
    [rememberDevice],
  );

  const refresh = useCallback(async () => {
    await flush();
    setBusy(true);
    try {
      const result = await list();
      if (result.storage === "ready") {
        deviceMode.current = false;
        setState(result);
        remember(result.records);
        setNotice(null);
        return;
      }
      if (result.storage === "unconfigured") {
        loadDeviceStore();
        return;
      }
      deviceMode.current = false;
      const cached = readJson<Cached>(CACHE_KEY);
      setState({
        ...result,
        records: cached?.records ?? [],
      });
      if (cached) {
        setNotice(`Showing the copy saved on ${new Date(cached.savedAt).toLocaleString("en-GB")}.`);
      }
    } catch (caught) {
      deviceMode.current = false;
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
  }, [flush, list, remember, loadDeviceStore]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Signing in or out changes what the database returns: a visitor sees only the
  // public catalogue, while an agronomist also sees the farmer records. Reload
  // when the identity changes, so the signed-in dashboard is never left showing
  // the visitor's list until the page is reloaded by hand.
  const identity = `${authorId ?? ""}\u0000${authorName ?? ""}`;
  const signedAs = useRef(identity);
  useEffect(() => {
    if (signedAs.current === identity) return;
    signedAs.current = identity;
    void refresh();
  }, [identity, refresh]);

  const save = useCallback(
    async (kind: RecordKind, data: unknown, id?: string | null) => {
      setBusy(true);
      setNotice(null);
      try {
        if (deviceMode.current || (id != null && isDeviceRecordId(id))) {
          return saveOnDevice(kind, data, id);
        }
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
        if (result.error === "unconfigured") {
          return saveOnDevice(kind, data, id);
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
    [applyLocalEdit, remember, saveOnDevice, saveRemote],
  );

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      setNotice(null);
      try {
        if (deviceMode.current || isDeviceRecordId(id)) {
          const records = readDevice().filter((record) => record.id !== id);
          deviceMode.current = true;
          setState({ storage: "device", records });
          rememberDevice(records);
          return { ok: true };
        }
        const result = await deleteRemote({ data: { id } });
        if (result.ok) {
          setState((current) => {
            const records = current.records.filter((record) => record.id !== id);
            remember(records);
            return { ...current, records };
          });
          return result;
        }
        if (result.error === "unconfigured") {
          const records = readDevice().filter((record) => record.id !== id);
          deviceMode.current = true;
          setState({ storage: "device", records });
          rememberDevice(records);
          return { ok: true };
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
    [deleteRemote, remember, rememberDevice],
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
    clearCache,
  };
}
