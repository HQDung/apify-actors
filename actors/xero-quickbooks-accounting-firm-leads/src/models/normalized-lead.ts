import type { DirectorySource } from "./input";
import type { SourceRecord } from "./source-record";

export interface NormalizedLead {
  firmName: string;
  advisorNames: string[];
  firmTypes: string[];
  locations: Array<Record<string, string | null>>;
  website: string | null;
  domain: string | null;
  phoneNumbers: string[];
  emails: Array<{
    email: string;
    type: string;
    source: DirectorySource | "website";
  }>;
  services: string[];
  industriesServed: string[];
  softwarePlatforms: Array<Record<string, unknown>>;
  contacts: Array<Record<string, unknown>>;
  socialLinks: Record<string, string | null>;
  languages: string[];
  descriptionOriginal: string | null;
  descriptionNormalized: string | null;
  sourcePlatforms: Array<DirectorySource | "website">;
  sourceRecords: SourceRecord[];
  completenessScore: number;
  scrapedAt: string;
  rawData: Record<string, unknown> | null;
}
