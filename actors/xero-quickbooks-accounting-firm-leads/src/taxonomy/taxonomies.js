export const firmTypes = Object.freeze([
  "accounting_firm",
  "bookkeeping_firm",
  "tax_advisor",
  "tax_agent",
  "audit_firm",
  "business_advisory_firm",
  "outsourced_finance_team",
  "individual_advisor",
  "unknown",
]);

export const services = Object.freeze([
  "accounting",
  "bookkeeping",
  "tax",
  "tax_preparation",
  "tax_planning",
  "payroll",
  "audit",
  "assurance",
  "business_advisory",
  "management_accounting",
  "financial_reporting",
  "cash_flow_management",
  "budgeting_forecasting",
  "outsourced_cfo",
  "company_formation",
  "accounts_payable",
  "accounts_receivable",
  "migration",
  "training",
  "software_setup",
  "inventory_accounting",
  "unknown",
]);

export const industries = Object.freeze([
  "agriculture",
  "construction",
  "ecommerce",
  "education",
  "financial_services",
  "healthcare",
  "hospitality",
  "legal",
  "manufacturing",
  "nonprofit",
  "professional_services",
  "property_real_estate",
  "retail",
  "technology",
  "transport_logistics",
  "trades",
  "wholesale",
  "general_small_business",
  "unknown",
]);

export const platformRelationships = Object.freeze([
  "certified_advisor",
  "proadvisor",
  "listed_advisor",
  "partner",
  "specialist",
  "claimed_experience",
  "unknown",
]);

const serviceRules = [
  [/\bbookkeep/iu, ["bookkeeping"]],
  [/\bcash[ -]?flow/iu, ["cash_flow_management"]],
  [/\bforecast/iu, ["budgeting_forecasting"]],
  [/\bbudget/iu, ["budgeting_forecasting"]],
  [/\bpayroll/iu, ["payroll"]],
  [/\btax preparation/iu, ["tax_preparation"]],
  [/\btax planning/iu, ["tax_planning"]],
  [/\btax/iu, ["tax"]],
  [/\baudit/iu, ["audit"]],
  [/\bassurance/iu, ["assurance"]],
  [/\bbusiness advis/iu, ["business_advisory"]],
  [/\bmanagement accounting/iu, ["management_accounting"]],
  [/\bfinancial reporting/iu, ["financial_reporting"]],
  [/\b(?:outsourced|virtual) cfo/iu, ["outsourced_cfo"]],
  [/\bcompany (?:formation|incorporation)/iu, ["company_formation"]],
  [/\baccounts payable/iu, ["accounts_payable"]],
  [/\baccounts receivable/iu, ["accounts_receivable"]],
  [/\bmigrat/iu, ["migration"]],
  [/\btraining/iu, ["training"]],
  [/\b(?:software|system) setup/iu, ["software_setup"]],
  [/\binventory accounting/iu, ["inventory_accounting"]],
  [/\baccounting/iu, ["accounting"]],
];

const industryRules = [
  [/\b(?:e[ -]?commerce|online retail)/iu, "ecommerce"],
  [/\b(?:computer|software)/iu, "technology"],
  [/\bconstruction/iu, "construction"],
  [/\bagricultur/iu, "agriculture"],
  [/\beducation/iu, "education"],
  [/\bfinancial services/iu, "financial_services"],
  [/\bhealth(?:care)?/iu, "healthcare"],
  [/\b(?:hospitality|hotel|restaurant)/iu, "hospitality"],
  [/\blegal/iu, "legal"],
  [/\bmanufactur/iu, "manufacturing"],
  [/\b(?:nonprofit|not-for-profit|charit)/iu, "nonprofit"],
  [/\bprofessional services/iu, "professional_services"],
  [/\b(?:property|real estate)/iu, "property_real_estate"],
  [/\bretail/iu, "retail"],
  [/\btechnology/iu, "technology"],
  [/\b(?:transport|logistics)/iu, "transport_logistics"],
  [/\btrades?/iu, "trades"],
  [/\bwholesale(?: distribution)?/iu, "wholesale"],
  [/\bsmall business/iu, "general_small_business"],
];

export const mapServices = (labels = []) => {
  const mapped = [];
  for (const label of labels) {
    for (const [pattern, ids] of serviceRules) {
      if (pattern.test(String(label))) mapped.push(...ids);
    }
  }
  return [...new Set(mapped)];
};

export const mapIndustries = (labels = []) => {
  const mapped = [];
  for (const label of labels) {
    for (const [pattern, id] of industryRules) {
      if (pattern.test(String(label))) mapped.push(id);
    }
  }
  return [...new Set(mapped)];
};
