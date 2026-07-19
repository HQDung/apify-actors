export interface VenueOutput {
  actorOutputSchemaVersion: 1;
  venueId: string;
  name: string | null;
  source: object;
  location: object;
  contact: object;
  business: object;
  venueTypes: Array<{ id: string; confidence: number }>;
  enrichment: object;
}
