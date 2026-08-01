const labelOf = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && value !== null && "label" in value)
    return value.label === null ? null : String(value.label);
  return String(value);
};

const reviewIdOf = (entry) => {
  const raw = labelOf(entry?.id);
  if (!raw) return null;
  const queryId = raw.match(/[?&]id=([^&#]+)/i)?.[1];
  return decodeURIComponent(queryId ?? raw.split("/").filter(Boolean).at(-1));
};

const integerLabel = (value) => {
  const number = Number(labelOf(value));
  return Number.isInteger(number) && number >= 0 ? number : null;
};

export const parseAppStoreReviews = (payload, { appId, country, language }) => {
  let json;
  try {
    json = typeof payload === "string" ? JSON.parse(payload) : payload;
  } catch {
    throw new Error(
      "APP_STORE_INVALID_RESPONSE: Apple review feed was not valid JSON",
    );
  }
  const entries = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];
  return entries
    .map((entry) => {
      const reviewId = reviewIdOf(entry);
      const rating = integerLabel(entry?.["im:rating"]);
      if (!reviewId || rating === null || rating < 1 || rating > 5) return null;
      return {
        reviewId,
        appId,
        rating,
        title: labelOf(entry?.title) ?? "",
        text: labelOf(entry?.content) ?? "",
        reviewDateText: labelOf(entry?.updated),
        appVersion: labelOf(entry?.["im:version"]),
        helpfulCount: integerLabel(entry?.["im:voteSum"]),
        developerReply: null,
        source: { country, language },
      };
    })
    .filter(Boolean);
};
