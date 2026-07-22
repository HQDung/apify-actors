export const xeroAdapter = {
  source: "xero",
  search: async () => {
    throw new Error(
      "The live Xero adapter is not implemented at the Phase 1 checkpoint.",
    );
  },
};
