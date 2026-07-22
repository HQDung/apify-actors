export const completenessScoreFor = (lead) => {
  let score = 0;
  if (lead.firmName) score += 5;
  if (lead.sourceRecords?.length) score += 10;
  if (lead.website || lead.domain) score += 15;
  if (lead.emails?.length) score += 15;
  if (lead.phoneNumbers?.length) score += 10;
  if (
    lead.locations?.some(
      (location) =>
        location.address &&
        location.city &&
        (location.country || location.countryCode),
    )
  )
    score += 10;
  if (lead.services?.length) score += 10;
  if (lead.industriesServed?.length) score += 5;
  if (
    lead.softwarePlatforms?.some(
      (platform) =>
        platform.certifications?.length || platform.specialties?.length,
    )
  )
    score += 10;
  if (lead.contacts?.some((contact) => contact.name)) score += 5;
  if (lead.descriptionOriginal || lead.descriptionNormalized) score += 5;
  return Math.min(score, 100);
};
