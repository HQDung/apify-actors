const commonSecondLevelSuffixes = new Set([
  "co.uk",
  "com.au",
  "co.nz",
  "com.sg",
  "com.vn",
  "co.za",
  "com.br",
]);

const toUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return new URL(
      /^https?:\/\//iu.test(value.trim())
        ? value.trim()
        : `https://${value.trim()}`,
    );
  } catch {
    return null;
  }
};

export const domainFromUrl = (value) => {
  const url = toUrl(value);
  if (!url) return null;
  const hostname = url.hostname
    .toLocaleLowerCase()
    .replace(/^(?:www\d*|m)\./u, "");
  const labels = hostname.split(".").filter(Boolean);
  if (labels.length <= 2) return hostname;
  const finalTwo = labels.slice(-2).join(".");
  return commonSecondLevelSuffixes.has(finalTwo)
    ? labels.slice(-3).join(".")
    : finalTwo;
};

export const canonicalizeUrl = (value) => {
  const url = toUrl(value);
  if (!url) return null;
  url.protocol = "https:";
  url.hostname = url.hostname.toLocaleLowerCase().replace(/^www\./u, "");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(?:utm_.+|fbclid|gclid)$/iu.test(key)) url.searchParams.delete(key);
  }
  url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
  const normalized = url.toString();
  return url.pathname === "/" && !url.search
    ? normalized.replace(/\/$/u, "")
    : normalized.replace(/\/$/u, "");
};
