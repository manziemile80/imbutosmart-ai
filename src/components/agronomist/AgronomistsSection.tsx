import { useState } from "react";
import { Mail, MapPin, MessageCircle, Phone, UserRound, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Callout, StatusPill } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import {
  DISTRICT_CHOICES,
  contactSpecializations,
  dashboardCopy,
  filterContacts,
  mailtoLink,
  telLink,
  whatsappLink,
  type ContactData,
} from "@/lib/agronomist-dashboard";
import { EditDelete, RecordManager, RecordMeta, type FieldDef } from "./RecordManager";
import type { SectionProps } from "./section-types";

const CONTACT_FIELDS: FieldDef[] = [
  { name: "fullName", label: "Full name", required: true },
  { name: "photoUrl", label: "Photo link", placeholder: "https://…" },
  { name: "qualifications", label: "Qualifications", type: "textarea", full: true },
  {
    name: "specialization",
    label: "Specialisation",
    placeholder: "e.g. soil fertility, horticulture",
  },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email", type: "text" },
  {
    name: "district",
    label: "District",
    type: "select",
    required: true,
    options: DISTRICT_CHOICES,
  },
  { name: "sector", label: "Sector" },
  { name: "workplace", label: "Workplace" },
  { name: "availability", label: "Availability" },
  {
    name: "verified",
    label: "Contact details verified",
    type: "checkbox",
    help: "I checked these details with the agronomist.",
  },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AgronomistsSection(props: SectionProps) {
  const t = dashboardCopy[props.language];
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [specialization, setSpecialization] = useState("");
  const contacts = props.records.filter((record) => record.kind === "contact");
  const visible = filterContacts(contacts, query, district, specialization);
  const specializations = contactSpecializations(props.records);

  return (
    <Panel aria-labelledby="agronomist-contacts-title">
      <PanelHeader
        icon={<Users className="size-5" aria-hidden="true" />}
        eyebrow={t.tabs.agronomists}
        title="Agronomist contacts"
        titleId="agronomist-contacts-title"
        description="Search by district and specialisation. A phone, email or WhatsApp button appears only when that detail has been recorded and the contact is marked verified."
      />
      <PanelBody>
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Input
            aria-label={t.common.search}
            placeholder={`${t.common.search} name or workplace…`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            aria-label="Filter by district"
            className="field h-9"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          >
            <option value="">{t.common.all} districts</option>
            {DISTRICT_CHOICES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by specialisation"
            className="field h-9"
            value={specialization}
            onChange={(event) => setSpecialization(event.target.value)}
          >
            <option value="">{t.common.all} specialisations</option>
            {specializations.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <RecordManager
          kind="contact"
          fields={CONTACT_FIELDS}
          records={visible}
          storage={props.storage}
          canEdit={props.canEdit}
          busy={props.busy}
          save={props.save}
          remove={props.remove}
          formTitle="Add an agronomist contact"
          listTitle={`Recorded agronomists (${contacts.length})`}
          empty="No agronomist contact has been recorded yet. Add one with the details the farmer may use."
          language={props.language}
          renderRecord={(record, actions) => {
            const data = record.data as unknown as ContactData;
            const whatsapp = whatsappLink(
              data.phone,
              `Hello ${data.fullName}, I would like to ask about a farmer's field.`,
            );
            const mail = mailtoLink(
              data.email,
              "ImbutoSmart advisory",
              "Hello, I would like to ask about a farmer's field.",
            );
            const phone = telLink(data.phone);
            return (
              <article className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  {data.photoUrl ? (
                    <img
                      src={data.photoUrl}
                      alt=""
                      className="size-12 rounded-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-foreground">
                      {initials(data.fullName) || (
                        <UserRound className="size-5" aria-hidden="true" />
                      )}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{data.fullName}</h4>
                      <StatusPill tone={data.verified ? "success" : "warning"}>
                        {data.verified ? t.common.verified : t.common.unverified}
                      </StatusPill>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[data.specialization, data.qualifications].filter(Boolean).join(" · ") ||
                        "Specialisation not recorded."}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {[data.district, data.sector, data.workplace].filter(Boolean).join(", ")}
                      </span>
                      <span>{data.availability || "Availability not recorded."}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {data.verified && phone && (
                    <Button asChild variant="outline" size="sm">
                      <a href={phone}>
                        <Phone aria-hidden="true" />
                        Call
                      </a>
                    </Button>
                  )}
                  {data.verified && whatsapp && (
                    <Button asChild variant="outline" size="sm">
                      <a href={whatsapp} target="_blank" rel="noreferrer">
                        <MessageCircle aria-hidden="true" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                  {data.verified && mail && (
                    <Button asChild variant="outline" size="sm">
                      <a href={mail}>
                        <Mail aria-hidden="true" />
                        Email
                      </a>
                    </Button>
                  )}
                  {!data.verified && (
                    <Callout tone="info" className="w-full text-xs">
                      Contact buttons stay hidden until the details are marked verified.
                    </Callout>
                  )}
                </div>
                <RecordMeta record={record} language={props.language} />
                <EditDelete actions={actions} language={props.language} />
              </article>
            );
          }}
        />
      </PanelBody>
    </Panel>
  );
}
