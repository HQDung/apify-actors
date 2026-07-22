const sensitiveName =
  /^(?:access_?token|authorization|cookie|key|password|session(?:id)?|token)$/iu;

export const sanitizeUrl = (value) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    for (const name of [...url.searchParams.keys()]) {
      if (sensitiveName.test(name)) {
        url.searchParams.set(name, "REDACTED");
      }
    }
    return url.href;
  } catch {
    return null;
  }
};

export const sanitizeError = (error) =>
  String(error?.message ?? error ?? "Unknown source error")
    .split(/\r?\n/u, 1)[0]
    .replace(
      /\b(token|cookie|password|authorization|session(?:id)?)=\S+/giu,
      "$1=REDACTED",
    )
    .slice(0, 500);

export const createSourceDiagnostic = ({
  source,
  location,
  stage,
  requestedUrl,
  status = null,
  contentType = null,
  responseSize = null,
  parsedItems = 0,
  error = null,
}) => ({
  source,
  location,
  stage,
  requestedUrl: sanitizeUrl(requestedUrl),
  httpStatus: status,
  contentType,
  responseSize,
  parsedItems,
  error: error ? sanitizeError(error) : null,
});
