import type { RecommendationInput, RecommendationResult } from "./recommendation";

// Local store for recommendations, built on IndexedDB with no dependency.
// Records survive an app close while offline; anything made offline is queued
// as pending and flushed when the connection returns. If IndexedDB is
// unavailable (private mode, very old device) the store degrades to an
// in-memory map for the session rather than blocking the farmer.

export type StoredRecommendation = {
  id: string;
  createdAt: number;
  input: RecommendationInput;
  result: RecommendationResult;
  syncState: "synced" | "pending";
};

const DB_NAME = "imbuto-recommendations";
const DB_VERSION = 1;
const STORE = "recommendations";
const MAX_RECORDS = 100;

let memoryFallback: Map<string, StoredRecommendation> | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    memoryFallback ??= new Map();
    return Promise.resolve(null);
  }
  dbPromise ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        memoryFallback ??= new Map();
        resolve(null);
      };
    } catch {
      memoryFallback ??= new Map();
      resolve(null);
    }
  });
  return dbPromise;
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        try {
          const transaction = db.transaction(STORE, mode);
          const request = run(transaction.objectStore(STORE));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

export async function saveRecommendation(
  input: RecommendationInput,
  result: RecommendationResult,
  syncState: StoredRecommendation["syncState"],
): Promise<StoredRecommendation> {
  const record: StoredRecommendation = {
    id: newId(),
    createdAt: Date.now(),
    input,
    result,
    syncState,
  };
  const db = await openDb();
  if (!db) {
    const map = memoryFallback ?? new Map();
    map.set(record.id, record);
    return record;
  }
  await withStore("readwrite", (store) => store.put(record) as IDBRequest<unknown>);
  return record;
}

export async function listRecommendations(): Promise<StoredRecommendation[]> {
  const db = await openDb();
  if (!db) return [...(memoryFallback?.values() ?? [])];
  const all =
    (await withStore<StoredRecommendation[]>(
      "readonly",
      (store) => store.getAll() as IDBRequest<StoredRecommendation[]>,
    )) ?? [];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function listPending(): Promise<StoredRecommendation[]> {
  return (await listRecommendations()).filter((record) => record.syncState === "pending");
}

export async function markSynced(ids: string[]): Promise<void> {
  const db = await openDb();
  if (!db) {
    for (const [id, record] of memoryFallback ?? []) {
      if (ids.includes(id)) memoryFallback?.set(id, { ...record, syncState: "synced" });
    }
    return;
  }
  const records = await Promise.all(
    ids.map((id) =>
      withStore<StoredRecommendation>(
        "readonly",
        (store) => store.get(id) as IDBRequest<StoredRecommendation>,
      ),
    ),
  );
  for (const record of records) {
    if (record)
      await withStore(
        "readwrite",
        (store) => store.put({ ...record, syncState: "synced" }) as IDBRequest<unknown>,
      );
  }
}

// Keep the newest MAX_RECORDS so the store never grows without bound on a
// device that is rarely online.
export async function trimOld(): Promise<void> {
  const all = await listRecommendations();
  if (all.length <= MAX_RECORDS) return;
  const stale = all.slice(MAX_RECORDS).map((record) => record.id);
  const db = await openDb();
  if (!db) {
    for (const id of stale) memoryFallback?.delete(id);
    return;
  }
  for (const id of stale)
    await withStore("readwrite", (store) => store.delete(id) as IDBRequest<undefined>);
}
