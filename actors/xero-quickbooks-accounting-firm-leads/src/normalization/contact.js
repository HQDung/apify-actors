export const normalizePhone = (value) => {
  if (typeof value !== "string") return null;
  const phone = value.trim().replace(/[^+\d]/gu, "");
  return phone.length >= 7 ? phone : null;
};

export const normalizeEmail = (value) => {
  if (typeof value !== "string") return null;
  const email = value.trim().toLocaleLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) ? email : null;
};

export const classifyEmail = (value) => {
  const email = normalizeEmail(value);
  if (!email) return "unknown";
  const local = email.split("@")[0];
  if (/^(?:info|hello|contact|office|admin)$/u.test(local)) return "general";
  if (/^(?:sales|business|enquiries|inquiries)$/u.test(local)) return "sales";
  if (/^(?:support|help|service)$/u.test(local)) return "support";
  if (/^(?:billing|accounts|finance)$/u.test(local)) return "billing";
  if (/^(?:careers|jobs|recruitment|hr)$/u.test(local)) return "careers";
  return "personal_business";
};
