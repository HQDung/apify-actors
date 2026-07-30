import { dietaryTagIds } from "../taxonomy/dietary-tags.js";

export const DEFAULT_KEYWORDS = [
  "healthy restaurant",
  "high protein restaurant",
  "healthy meal prep",
  "salad bar",
  "clean eating restaurant",
];

const menuStatuses = new Set([
  "not_requested",
  "website_missing",
  "website_unreachable",
  "menu_not_found",
  "menu_found",
  "unsupported_format",
  "extraction_failed",
  "extracted",
  "extracted_empty",
]);
const menuExtractionMethods = new Set([
  "json_ld",
  "embedded_json",
  "dom_repeated_structure",
  "generic_text_parser",
]);

const dietaryTagIdSet = new Set(dietaryTagIds);
const dietarySourceTypes = new Set([
  "restaurant_claim",
  "menu_label",
  "menu_section",
  "menu_description",
  "website_metadata",
  "inferred",
]);

const boundedInteger = (value, fallback, minimum, maximum, field) => {
  const number = value === undefined ? fallback : value;
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(
      `${field} must be an integer between ${minimum} and ${maximum}.`,
    );
  }
  return number;
};

const booleanWithDefault = (value, fallback, field) => {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean")
    throw new TypeError(`${field} must be a boolean.`);
  return value;
};

const normalizeKeywords = (value) => {
  if (value === undefined) return [...DEFAULT_KEYWORDS];
  if (!Array.isArray(value)) throw new TypeError("keywords must be an array.");

  const keywords = [];
  const seen = new Set();
  for (const keyword of value) {
    if (typeof keyword !== "string")
      throw new TypeError("Each keyword must be a string.");
    const normalized = keyword.trim();
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      keywords.push(normalized);
    }
  }
  return keywords;
};

export const validateInput = (raw = {}) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new TypeError("Input must be an object.");
  if (typeof raw.location !== "string")
    throw new TypeError("location must be a string.");
  const location = raw.location.trim();
  if (!location) throw new Error("location is required.");

  const normalizedOutputLanguage = raw.normalizedOutputLanguage ?? "en";
  if (raw.normalizedOutputLanguage === null)
    throw new Error("normalizedOutputLanguage must be en.");
  if (normalizedOutputLanguage !== "en")
    throw new Error("normalizedOutputLanguage must be en.");

  return {
    location,
    keywords: normalizeKeywords(raw.keywords),
    maxRestaurants: boundedInteger(
      raw.maxRestaurants,
      30,
      1,
      100,
      "maxRestaurants",
    ),
    includeMenu: booleanWithDefault(raw.includeMenu, true, "includeMenu"),
    normalizedOutputLanguage,
    preserveOriginalText: booleanWithDefault(
      raw.preserveOriginalText,
      true,
      "preserveOriginalText",
    ),
    maxMenuPagesPerRestaurant: boundedInteger(
      raw.maxMenuPagesPerRestaurant,
      3,
      1,
      10,
      "maxMenuPagesPerRestaurant",
    ),
    maxMenuItemsPerRestaurant: boundedInteger(
      raw.maxMenuItemsPerRestaurant,
      200,
      1,
      1000,
      "maxMenuItemsPerRestaurant",
    ),
  };
};

const containsUndefined = (value, seen = new Set()) => {
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) return true;
    return value.some((entry) => containsUndefined(entry, seen));
  }
  return Object.values(value).some((entry) => containsUndefined(entry, seen));
};

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const nullableString = (value) => value === null || typeof value === "string";

const nullableNumber = (value) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

const nullableNonNegativeNumber = (value) =>
  nullableNumber(value) && (value === null || value >= 0);

const validDietaryTags = (tags) =>
  Array.isArray(tags) &&
  tags.every(
    (tag) =>
      isRecord(tag) &&
      dietaryTagIdSet.has(tag.id) &&
      nullableString(tag.labelOriginal) &&
      dietarySourceTypes.has(tag.sourceType) &&
      nullableString(tag.sourceUrl) &&
      typeof tag.confidence === "number" &&
      Number.isFinite(tag.confidence) &&
      tag.confidence >= 0 &&
      tag.confidence <= 1,
  );

const validNutrition = (nutrition) =>
  nutrition === null ||
  (isRecord(nutrition) &&
    nullableNonNegativeNumber(nutrition.calories) &&
    nullableNonNegativeNumber(nutrition.proteinGrams) &&
    nullableNonNegativeNumber(nutrition.carbohydrateGrams) &&
    nullableNonNegativeNumber(nutrition.fatGrams) &&
    nullableNonNegativeNumber(nutrition.sodiumMilligrams) &&
    nullableString(nutrition.servingSizeOriginal) &&
    nutrition.sourceType === "restaurant_published" &&
    typeof nutrition.sourceUrl === "string");

const validPrice = (price) =>
  price === null ||
  (isRecord(price) &&
    nullableNumber(price.amount) &&
    (price.amounts === undefined ||
      (Array.isArray(price.amounts) &&
        price.amounts.every((amount) => nullableNumber(amount)))) &&
    nullableString(price.currency) &&
    nullableString(price.formattedOriginal) &&
    (price.priceType === undefined ||
      ["fixed", "from", "range", "multiple", "unknown"].includes(
        price.priceType,
      )));

const validMenuItem = (item) =>
  isRecord(item) &&
  Object.keys(item).length > 0 &&
  typeof item.nameOriginal === "string" &&
  typeof item.nameNormalized === "string" &&
  nullableString(item.descriptionOriginal) &&
  nullableString(item.descriptionNormalized) &&
  nullableString(item.sectionOriginal) &&
  nullableString(item.sectionNormalized) &&
  hasOwn(item, "price") &&
  validPrice(item.price) &&
  hasOwn(item, "publishedNutrition") &&
  validNutrition(item.publishedNutrition) &&
  validDietaryTags(item.dietaryTags) &&
  typeof item.sourceUrl === "string" &&
  Array.isArray(item.extractionMethods) &&
  item.extractionMethods.every((method) => menuExtractionMethods.has(method));

const validMenu = (menu) =>
  isRecord(menu) &&
  menuStatuses.has(menu.status) &&
  nullableString(menu.sourceUrl) &&
  Array.isArray(menu.menuUrls) &&
  menu.menuUrls.every((url) => typeof url === "string") &&
  Array.isArray(menu.menuCandidates) &&
  menu.menuCandidates.every(
    (candidate) =>
      isRecord(candidate) &&
      typeof candidate.url === "string" &&
      typeof candidate.sourceUrl === "string" &&
      ["html", "pdf", "image", "third_party_ordering", "unknown"].includes(
        candidate.format,
      ) &&
      typeof candidate.score === "number" &&
      Number.isFinite(candidate.score) &&
      typeof candidate.sameDomain === "boolean" &&
      Array.isArray(candidate.sources) &&
      candidate.sources.every((source) => typeof source === "string"),
  ) &&
  Array.isArray(menu.extractionMethods) &&
  menu.extractionMethods.every((method) => menuExtractionMethods.has(method)) &&
  Array.isArray(menu.items) &&
  Number.isInteger(menu.itemsFound) &&
  menu.itemsFound >= 0 &&
  menu.itemsFound === menu.items.length &&
  menu.items.every(validMenuItem);

const validLocation = (location) =>
  isRecord(location) &&
  nullableString(location.address) &&
  nullableString(location.city) &&
  nullableString(location.region) &&
  nullableString(location.country) &&
  nullableString(location.countryCode) &&
  nullableString(location.postalCode) &&
  nullableNumber(location.latitude) &&
  nullableNumber(location.longitude);

const validContact = (contact) =>
  isRecord(contact) &&
  nullableString(contact.website) &&
  nullableString(contact.phone);

const validSourceBusiness = (sourceBusiness) =>
  isRecord(sourceBusiness) &&
  typeof sourceBusiness.platform === "string" &&
  typeof sourceBusiness.sourceUrl === "string" &&
  typeof sourceBusiness.scrapedAt === "string";

const validHealthyPositioning = (healthyPositioning) =>
  isRecord(healthyPositioning) &&
  typeof healthyPositioning.isHealthyFocused === "boolean" &&
  typeof healthyPositioning.confidence === "number" &&
  Number.isFinite(healthyPositioning.confidence) &&
  healthyPositioning.confidence >= 0 &&
  healthyPositioning.confidence <= 1 &&
  Array.isArray(healthyPositioning.signals) &&
  healthyPositioning.signals.every(
    (signal) =>
      isRecord(signal) &&
      typeof signal.type === "string" &&
      typeof signal.value === "string" &&
      hasOwn(signal, "sourceUrl") &&
      nullableString(signal.sourceUrl),
  );

const validMessages = (messages) =>
  Array.isArray(messages) &&
  messages.every(
    (message) =>
      isRecord(message) &&
      typeof message.code === "string" &&
      typeof message.message === "string" &&
      (!hasOwn(message, "sourceUrl") || nullableString(message.sourceUrl)),
  );

const validLanguage = (language) =>
  isRecord(language) &&
  nullableString(language.detected) &&
  language.normalizedOutput === "en";

export const isRestaurantOutput = (record) => {
  if (
    !record ||
    typeof record !== "object" ||
    Array.isArray(record) ||
    containsUndefined(record)
  )
    return false;

  return (
    record.actorOutputSchemaVersion === 1 &&
    typeof record.restaurantName === "string" &&
    typeof record.restaurantNameNormalized === "string" &&
    Array.isArray(record.matchedKeywords) &&
    record.matchedKeywords.every((keyword) => typeof keyword === "string") &&
    validLocation(record.location) &&
    validContact(record.contact) &&
    validSourceBusiness(record.sourceBusiness) &&
    nullableNumber(record.rating) &&
    (record.reviewCount === null ||
      (Number.isInteger(record.reviewCount) && record.reviewCount >= 0)) &&
    nullableString(record.priceLevel) &&
    validHealthyPositioning(record.healthyPositioning) &&
    validMessages(record.warnings) &&
    validMessages(record.errors) &&
    Array.isArray(record.dietaryOptions) &&
    validDietaryTags(record.dietaryOptions) &&
    validMenu(record.menu) &&
    validLanguage(record.language) &&
    typeof record.scrapedAt === "string"
  );
};

export const outputValidationIssues = (record) => {
  const issues = [];
  if (!record || typeof record !== "object") return ["record"];
  const findUndefined = (value, path = "record", seen = new Set()) => {
    if (value === undefined) return [path];
    if (!value || typeof value !== "object" || seen.has(value)) return [];
    seen.add(value);
    if (Array.isArray(value))
      return value.flatMap((entry, index) =>
        findUndefined(entry, `${path}[${index}]`, seen),
      );
    return Object.entries(value).flatMap(([key, entry]) =>
      findUndefined(entry, `${path}.${key}`, seen),
    );
  };
  issues.push(...findUndefined(record));
  if (record.actorOutputSchemaVersion !== 1)
    issues.push("actorOutputSchemaVersion");
  if (typeof record.restaurantName !== "string") issues.push("restaurantName");
  if (typeof record.restaurantNameNormalized !== "string")
    issues.push("restaurantNameNormalized");
  if (
    !Array.isArray(record.matchedKeywords) ||
    !record.matchedKeywords.every((keyword) => typeof keyword === "string")
  )
    issues.push("matchedKeywords");
  if (!validLocation(record.location)) issues.push("location");
  if (!validContact(record.contact)) issues.push("contact");
  if (!validSourceBusiness(record.sourceBusiness))
    issues.push("sourceBusiness");
  if (!nullableNumber(record.rating)) issues.push("rating");
  if (!(
    record.reviewCount === null ||
    (Number.isInteger(record.reviewCount) && record.reviewCount >= 0)
  ))
    issues.push("reviewCount");
  if (!nullableString(record.priceLevel)) issues.push("priceLevel");
  if (!validLanguage(record.language)) issues.push("language");
  if (typeof record.scrapedAt !== "string") issues.push("scrapedAt");
  if (!validMenu(record.menu)) {
    issues.push("menu");
    if (Array.isArray(record.menu?.items)) {
      record.menu.items.forEach((item, index) => {
        if (!validMenuItem(item)) issues.push(`menu.items[${index}]`);
      });
    }
    if (Array.isArray(record.menu?.menuCandidates)) {
      record.menu.menuCandidates.forEach((candidate, index) => {
        if (
          !isRecord(candidate) ||
          typeof candidate.url !== "string" ||
          typeof candidate.sourceUrl !== "string" ||
          !["html", "pdf", "image", "third_party_ordering", "unknown"].includes(
            candidate.format,
          ) ||
          typeof candidate.score !== "number" ||
          !Number.isFinite(candidate.score) ||
          typeof candidate.sameDomain !== "boolean" ||
          !Array.isArray(candidate.sources)
        )
          issues.push(`menu.menuCandidates[${index}]`);
      });
    }
  }
  if (!validDietaryTags(record.dietaryOptions)) issues.push("dietaryOptions");
  if (!validHealthyPositioning(record.healthyPositioning))
    issues.push("healthyPositioning");
  if (!validMessages(record.warnings)) issues.push("warnings");
  if (!validMessages(record.errors)) issues.push("errors");
  return issues;
};
