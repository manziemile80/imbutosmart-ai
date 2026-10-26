import { useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardCopy,
  parseRecordData,
  recordsWereCounted,
  type AgronomistRecord,
  type RecordKind,
  type SaveResult,
  type StorageState,
} from "@/lib/agronomist-dashboard";
import type { FarmerLanguage } from "@/lib/farmer-language";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "select" | "checkbox";
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  required?: boolean;
  step?: string;
  min?: string;
  max?: string;
  full?: boolean;
};

export type RecordActions = {
  edit: () => void;
  remove: () => void;
  canEdit: boolean;
};

type Props = {
  kind: RecordKind;
  fields: FieldDef[];
  records: AgronomistRecord[];
  storage: StorageState;
  canEdit: boolean;
  busy: boolean;
  save: (kind: RecordKind, data: unknown, id?: string | null) => Promise<SaveResult>;
  remove: (id: string) => Promise<SaveResult>;
  renderRecord: (record: AgronomistRecord, actions: RecordActions) => ReactNode;
  formTitle: string;
  listTitle: string;
  empty: string;
  language: FarmerLanguage;
  /** Optional extra content below the form, such as a reference catalogue. */
  children?: ReactNode;
};

function toPayload(fields: FieldDef[], form: HTMLFormElement): Record<string, unknown> {
  const data = new FormData(form);
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "checkbox") {
      payload[field.name] = data.get(field.name) === "on";
      continue;
    }
    const raw = String(data.get(field.name) ?? "").trim();
    if (field.type === "number") {
      payload[field.name] = raw === "" ? null : Number(raw);
    } else if (field.type === "date") {
      payload[field.name] = raw === "" ? null : raw;
    } else if (field.type === "select") {
      // An optional select shows an empty "None" choice. The schema expects null
      // for a value that was not chosen, not an empty string, which no enum
      // accepts. Required selects always carry one of their options.
      payload[field.name] = raw === "" ? null : raw;
    } else {
      payload[field.name] = raw;
    }
  }
  return payload;
}

function initialValue(record: AgronomistRecord | null, field: FieldDef): string {
  const value = record?.data[field.name];
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "on" : "";
  return String(value);
}

export function RecordManager({
  kind,
  fields,
  records,
  storage,
  canEdit,
  busy,
  save,
  remove,
  renderRecord,
  formTitle,
  listTitle,
  empty,
  language,
  children,
}: Props) {
  const t = dashboardCopy[language].common;
  const [editing, setEditing] = useState<AgronomistRecord | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // A list of zero only means "nothing is stored" once the database has been
  // read. When it could not be read, the title and the empty line say so rather
  // than reporting a count of 0.
  const counted = recordsWereCounted(storage, records.length);
  const loading = storage === "loading";
  const shownTitle = counted
    ? listTitle
    : loading
      ? listTitle.replace(/\s*\(\d+\)/, "")
      : listTitle.replace(/\(\d+\)/, "(not counted)");
  const shownEmpty = counted
    ? empty
    : loading
      ? "Loading the records…"
      : "The records database could not be read, so this list is not known to be empty. The reference catalogue and the published figures still work.";

  function startAdd() {
    setEditing(null);
    setError(null);
    setNotice(null);
    setFormKey((value) => value + 1);
    setOpen(true);
  }

  function startEdit(record: AgronomistRecord) {
    setEditing(record);
    setError(null);
    setNotice(null);
    setFormKey((value) => value + 1);
    setOpen(true);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const payload = toPayload(fields, event.currentTarget);
    const parsed = parseRecordData(kind, payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the record details.");
      return;
    }
    const result = await save(kind, parsed.data, editing?.id ?? null);
    if (result.ok || result.queued) {
      setEditing(null);
      setOpen(false);
      setFormKey((value) => value + 1);
      setNotice(
        result.queued
          ? "Kept on this device and sent when the connection returns. A new record appears in the list after the server accepts it; an edit is shown from the local copy."
          : storage === "device"
            ? "Saved on this device. The record is kept in this browser with its author and the time of the change."
            : "Saved. The record keeps the author's name and the time of the change.",
      );
    } else {
      setError(result.message ?? "The record could not be saved.");
    }
  }

  async function onDelete(record: AgronomistRecord) {
    if (!window.confirm(t.deleteConfirm)) return;
    setError(null);
    const result = await remove(record.id);
    if (!result.ok && !result.queued) {
      setError(result.message ?? "The record could not be deleted.");
    }
  }

  return (
    <div className="grid gap-5">
      {storage !== "ready" && storage !== "loading" && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {storage === "device"
            ? "Saved on this device: a record you add or change here stays in this browser. It is not shared with another device yet."
            : storage === "unconfigured"
              ? "This browser could not keep a local copy, so changes are disabled. The reference catalogue below still works."
              : "The records database could not be reached; changes are kept in this browser until it returns."}
        </p>
      )}
      {notice && <Callout tone="success">{notice}</Callout>}
      {error && (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      )}

      {canEdit ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {editing ? `${t.edit}: ${formTitle}` : formTitle}
            </h3>
            <Button
              type="button"
              variant={open ? "ghost" : "outline"}
              size="sm"
              onClick={() => (open ? setOpen(false) : startAdd())}
            >
              {open ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
              {open ? t.cancel : t.add}
            </Button>
          </div>

          {open && (
            <form key={formKey} onSubmit={onSubmit} className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => {
                  const id = `${kind}-${field.name}-${formKey}`;
                  const value = initialValue(editing, field);
                  const full = field.full || field.type === "textarea";
                  return (
                    <label
                      key={field.name}
                      htmlFor={id}
                      className={full ? "grid gap-1.5 sm:col-span-2" : "grid gap-1.5"}
                    >
                      <span className="field-label">
                        {field.label}
                        {field.required && <span className="text-destructive"> *</span>}
                      </span>
                      {field.type === "textarea" ? (
                        <Textarea
                          id={id}
                          name={field.name}
                          defaultValue={value}
                          placeholder={field.placeholder}
                          rows={3}
                        />
                      ) : field.type === "select" ? (
                        <select
                          id={id}
                          name={field.name}
                          defaultValue={value}
                          className="field h-10"
                        >
                          {!field.required && <option value="">{t.none}</option>}
                          {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "checkbox" ? (
                        <span className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            id={id}
                            name={field.name}
                            type="checkbox"
                            defaultChecked={Boolean(editing?.data[field.name])}
                            className="size-4 rounded border-border"
                          />
                          {field.help ?? field.label}
                        </span>
                      ) : (
                        <Input
                          id={id}
                          name={field.name}
                          type={field.type ?? "text"}
                          defaultValue={value}
                          placeholder={field.placeholder}
                          step={field.step}
                          min={field.min}
                          max={field.max}
                        />
                      )}
                      {field.help && field.type !== "checkbox" && (
                        <span className="text-xs leading-relaxed text-muted-foreground">
                          {field.help}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <LoaderCircle
                      className="animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Save aria-hidden="true" />
                  )}
                  {busy ? t.saving : t.save}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setOpen(false);
                    setError(null);
                  }}
                >
                  {t.cancel}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <Callout tone="info">{t.readOnlyNotice}</Callout>
      )}

      <section aria-label={shownTitle}>
        <h3 className="text-sm font-semibold text-foreground">{shownTitle}</h3>
        {records.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{shownEmpty}</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {records.map((record) => (
              <li key={record.id}>
                {renderRecord(record, {
                  edit: () => startEdit(record),
                  remove: () => void onDelete(record),
                  canEdit,
                })}
              </li>
            ))}
          </ul>
        )}
      </section>

      {children}
    </div>
  );
}

export function RecordMeta({
  record,
  language,
}: {
  record: AgronomistRecord;
  language: FarmerLanguage;
}) {
  const t = dashboardCopy[language].common;
  return (
    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
      {t.updated} {new Date(record.updatedAt).toLocaleString("en-GB")}
      {record.updatedByName ? ` ${t.by} ${record.updatedByName}` : ""}
    </p>
  );
}

export function EditDelete({
  actions,
  language,
}: {
  actions: RecordActions;
  language: FarmerLanguage;
}) {
  if (!actions.canEdit) return null;
  const t = dashboardCopy[language].common;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={actions.edit}>
        <Pencil aria-hidden="true" />
        {t.edit}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={actions.remove}>
        <Trash2 aria-hidden="true" />
        {t.delete}
      </Button>
    </div>
  );
}
