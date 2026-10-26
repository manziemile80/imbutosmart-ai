import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  RECORD_SCHEMAS,
  isAgronomistClaims,
  isRecordKind,
  type AgronomistRecord,
  type AuthClaims,
  type RecordKind,
  type RecordData,
  type RecordList,
  type SaveResult,
} from "./agronomist-dashboard";

// Server-only access to the agronomist records.
//
// The table is `agronomist_records` (see supabase/migrations). Authorization is
// enforced twice: this module refuses a write unless the signed-in account has
// the agronomist role, and the database's row-level policies enforce the same
// rule for direct API calls. A deployment with no Supabase configuration still
// serves the published figures and the reference catalogue; it simply reports
// that records are unavailable instead of failing the page.

type Row = {
  id: string;
  kind: string;
  data: unknown;
  created_by: string | null;
  created_by_name: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
};

type Session = {
  configured: boolean;
  token: string | null;
  claims: AuthClaims | null;
  userId: string | null;
  email: string | null;
  name: string | null;
  isAgronomist: boolean;
  client: SupabaseClient | null;
};

function configuredClient(token: string | null): SupabaseClient | null {
  const url = process.env["SUPABASE_URL"]?.replace(/\/+$/, "");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  return createClient(url, key, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function bearerToken(request: Request | undefined): string | null {
  const header = request?.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export async function readSession(): Promise<Session> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const token = bearerToken(request);
  const client = configuredClient(token);
  if (!client) {
    return {
      configured: false,
      token,
      claims: null,
      userId: null,
      email: null,
      name: null,
      isAgronomist: false,
      client: null,
    };
  }
  if (!token) {
    return {
      configured: true,
      token,
      claims: null,
      userId: null,
      email: null,
      name: null,
      isAgronomist: false,
      client,
    };
  }
  const { data, error } = await client.auth.getClaims(token);
  const claims = (data?.claims ?? null) as AuthClaims | null;
  if (error || !claims?.sub) {
    return {
      configured: true,
      token,
      claims: null,
      userId: null,
      email: null,
      name: null,
      isAgronomist: false,
      client,
    };
  }
  return {
    configured: true,
    token,
    claims,
    userId: claims.sub ?? null,
    email: claims.email ?? null,
    name: claims.user_metadata?.full_name ?? claims.email ?? null,
    isAgronomist: isAgronomistClaims(claims),
    client,
  };
}

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01") return true;
  return /does not exist|could not find the table|schema cache/i.test(error.message ?? "");
}

function toRecord(row: Row): AgronomistRecord | null {
  if (!isRecordKind(row.kind)) return null;
  return {
    id: row.id,
    kind: row.kind,
    data:
      row.data && typeof row.data === "object" && !Array.isArray(row.data)
        ? (row.data as RecordData)
        : {},
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    updatedBy: row.updated_by,
    updatedByName: row.updated_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRecords(): Promise<RecordList> {
  const session = await readSession();
  if (!session.client) {
    return { storage: "unconfigured", records: [] };
  }
  const { data, error } = await session.client
    .from("agronomist_records")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(2_000);
  if (error) {
    const state = missingTable(error) ? "unconfigured" : "error";
    return { storage: state, records: [], message: error.message };
  }
  const records = ((data ?? []) as Row[])
    .map(toRecord)
    .filter((record): record is AgronomistRecord => record !== null);
  return { storage: "ready", records };
}

export async function saveRecord(
  kind: RecordKind,
  data: unknown,
  id: string | null,
): Promise<SaveResult> {
  if (!isRecordKind(kind)) {
    return { ok: false, error: "invalid", message: "Unknown record type." };
  }
  const parsed = RECORD_SCHEMAS[kind].safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid",
      message: parsed.error.issues[0]?.message ?? "Check the record details.",
    };
  }

  const session = await readSession();
  if (!session.client) {
    return {
      ok: false,
      error: "unconfigured",
      message: "The records database is not configured.",
    };
  }
  if (!session.userId || !session.isAgronomist) {
    return {
      ok: false,
      error: "auth",
      message: "Only a signed-in agronomist can change records.",
    };
  }

  const now = new Date().toISOString();
  const row = {
    kind,
    data: parsed.data,
    updated_by: session.userId,
    updated_by_name: session.name,
    updated_at: now,
  };
  const query = id
    ? session.client.from("agronomist_records").update(row).eq("id", id)
    : session.client
        .from("agronomist_records")
        .insert({ ...row, created_by: session.userId, created_by_name: session.name });
  const { data: saved, error } = await query.select("*").single();

  if (error || !saved) {
    const state = missingTable(error) ? "unconfigured" : "failed";
    return {
      ok: false,
      error: state,
      message: error?.message ?? "The record could not be saved.",
    };
  }

  await audit(session, id ? "update" : "create", kind, (saved as Row).id, parsed.data);
  const record = toRecord(saved as Row);
  return record ? { ok: true, record } : { ok: false, error: "failed" };
}

export async function deleteRecord(id: string): Promise<SaveResult> {
  if (!id.trim()) return { ok: false, error: "invalid", message: "Missing record id." };
  const session = await readSession();
  if (!session.client) {
    return {
      ok: false,
      error: "unconfigured",
      message: "The records database is not configured.",
    };
  }
  if (!session.userId || !session.isAgronomist) {
    return {
      ok: false,
      error: "auth",
      message: "Only a signed-in agronomist can delete records.",
    };
  }
  const { data, error } = await session.client
    .from("agronomist_records")
    .delete()
    .eq("id", id)
    .select("id, kind")
    .single();
  if (error) {
    return {
      ok: false,
      error: missingTable(error) ? "unconfigured" : "failed",
      message: error.message,
    };
  }
  await audit(session, "delete", String((data as { kind?: string } | null)?.kind ?? ""), id, {});
  return { ok: true };
}

async function audit(
  session: Session,
  action: "create" | "update" | "delete",
  kind: string,
  recordId: string,
  detail: unknown,
): Promise<void> {
  if (!session.client || !session.userId) return;
  const { error } = await session.client.from("agronomist_audit").insert({
    actor_id: session.userId,
    actor_name: session.name,
    action,
    kind,
    record_id: recordId,
    detail,
  });
  // The audit table is an operational aid, not a reason to lose the change the
  // agronomist just made. A missing table is reported by the storage notice.
  if (error && !missingTable(error)) {
    console.error("[agronomist] audit write failed", error.message);
  }
}

// The dashboard shows the signed-in identity and role in the browser, but the
// server never trusts the browser's view: `saveRecord` and `deleteRecord` call
// `readSession` again and check the role on every mutation.
export async function currentIdentity() {
  const session = await readSession();
  return {
    configured: session.configured,
    signedIn: Boolean(session.userId),
    isAgronomist: session.isAgronomist,
    email: session.email,
    name: session.name,
  };
}
