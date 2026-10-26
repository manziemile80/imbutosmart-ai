import type {
  AgronomistRecord,
  RecordKind,
  SaveResult,
  StorageState,
} from "@/lib/agronomist-dashboard";
import type { FarmerLanguage } from "@/lib/farmer-language";

export type SectionProps = {
  records: AgronomistRecord[];
  storage: StorageState;
  canEdit: boolean;
  busy: boolean;
  language: FarmerLanguage;
  save: (kind: RecordKind, data: unknown, id?: string | null) => Promise<SaveResult>;
  remove: (id: string) => Promise<SaveResult>;
  refresh: () => Promise<void>;
};
