const STEAM_APP_PATH = /\/(?:app)\/(\d+)(?:\/|$)/i;

export const extractSteamAppId = (value) => {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const parsed = new URL(value);
    if (!/(?:^|\.)steampowered\.com$|(?:^|\.)steamcommunity\.com$/i.test(parsed.hostname)) {
      return null;
    }
    return parsed.pathname.match(STEAM_APP_PATH)?.[1] ?? null;
  } catch {
    return null;
  }
};

export const mergeSteamAppIds = (explicitIds = [], urls = []) => {
  const values = [...explicitIds, ...urls]
    .map((value) => (typeof value === "object" && value !== null ? value.url : value))
    .map((value) => {
      const id = extractSteamAppId(value);
      if (id) return id;
      if (typeof value === "number" && Number.isInteger(value) && value > 0) return String(value);
      if (typeof value === "string" && /^\d+$/.test(value.trim())) return value.trim();
      return null;
    })
    .filter(Boolean);
  return [...new Set(values)];
};
