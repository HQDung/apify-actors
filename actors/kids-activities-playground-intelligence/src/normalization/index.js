import { createHash } from "node:crypto";

export const cleanText = (value) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() || null : null;
export const normalizeText = (value) =>
  cleanText(value)
    ?.toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") ?? "";
export const normalizeUrl = (value) => {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return null;
  }
};
export const domainOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};
export const hash = (value) =>
  createHash("sha256").update(value).digest("hex").slice(0, 24);
export const detectLanguage = (text = "") =>
  /[ăâđêôơư]|\b(khu vui chơi|trẻ em|giá vé|đặt chỗ)\b/i.test(text)
    ? "vi"
    : "en";
export const normalizePhone = (phone) => phone?.replace(/[^+\d]/g, "") ?? null;
