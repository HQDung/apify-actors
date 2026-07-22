const unionStrings = (left = [], right = []) => [
  ...new Set([...left, ...right].filter(Boolean)),
];

const unionObjects = (left = [], right = [], keyFor = JSON.stringify) => {
  const values = new Map();
  for (const value of [...left, ...right]) {
    const key = keyFor(value);
    if (!values.has(key)) values.set(key, value);
  }
  return [...values.values()];
};

export const mergeFirms = (left, right) => ({
  ...left,
  advisorNames: unionStrings(left.advisorNames, right.advisorNames),
  firmTypes: unionStrings(left.firmTypes, right.firmTypes),
  locations: unionObjects(left.locations, right.locations, (location) =>
    [
      location.address,
      location.city,
      location.region,
      location.postalCode,
      location.countryCode ?? location.country,
    ]
      .map((value) => String(value ?? "").toLocaleLowerCase())
      .join("|"),
  ),
  website: left.website ?? right.website,
  domain: left.domain ?? right.domain,
  phoneNumbers: unionStrings(left.phoneNumbers, right.phoneNumbers),
  emails: unionObjects(left.emails, right.emails, (email) => email.email),
  services: unionStrings(left.services, right.services),
  industriesServed: unionStrings(left.industriesServed, right.industriesServed),
  softwarePlatforms: unionObjects(
    left.softwarePlatforms,
    right.softwarePlatforms,
    (platform) => `${platform.platform}:${platform.profileUrl ?? ""}`,
  ),
  contacts: unionObjects(
    left.contacts,
    right.contacts,
    (contact) => `${contact.name}:${contact.profileUrl ?? ""}`,
  ),
  socialLinks: Object.fromEntries(
    Object.keys({ ...left.socialLinks, ...right.socialLinks }).map((key) => [
      key,
      left.socialLinks?.[key] ?? right.socialLinks?.[key] ?? null,
    ]),
  ),
  languages: unionStrings(left.languages, right.languages),
  descriptionOriginal: left.descriptionOriginal ?? right.descriptionOriginal,
  descriptionNormalized:
    left.descriptionNormalized ?? right.descriptionNormalized,
  sourcePlatforms: unionStrings(left.sourcePlatforms, right.sourcePlatforms),
  sourceRecords: unionObjects(
    left.sourceRecords,
    right.sourceRecords,
    (record) =>
      `${record.source}:${record.profileUrl}:${record.locationQuery ?? ""}`,
  ),
  rawData:
    left.rawData || right.rawData
      ? { ...(left.rawData ?? {}), ...(right.rawData ?? {}) }
      : null,
});
