import type { DirectorySource } from "./input";

export interface DirectorySearchItem {
  id: string;
  profileUrl: string;
}

export interface SourceRecord {
  source: DirectorySource | "website";
  profileUrl: string;
  locationQuery?: string;
}

export interface AdvisorDirectoryAdapter<
  SearchItem = DirectorySearchItem,
  Profile = unknown,
> {
  source: DirectorySource;
  search(params: { location: string; limit: number }): Promise<SearchItem[]>;
  fetchProfile(item: SearchItem): Promise<Profile>;
  normalize(
    profile: Profile,
    context: { locationQuery: string; includeRawData: boolean },
  ): Promise<unknown> | unknown;
}
