export type DirectorySource = "xero" | "quickbooks";

export interface ActorInput {
  locations: string[];
  sources: DirectorySource[];
  maxResults: number;
  enrichWebsites: boolean;
  extractContacts: boolean;
  includeRawData: boolean;
  proxyConfiguration: { useApifyProxy: boolean; [key: string]: unknown };
}
