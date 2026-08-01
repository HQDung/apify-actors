export const createUsageStats = () => {
  const counters = {
    providerAttempts: 0,
    fallbackCount: 0,
    invalidResponses: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
  };
  return {
    increment(name, amount = 1) {
      counters[name] = (counters[name] ?? 0) + Number(amount || 0);
    },
    record(usage = {}) {
      for (const field of ["inputTokens", "outputTokens", "estimatedCost"]) this.increment(field, usage[field] ?? 0);
    },
    summary() {
      return { ...counters };
    },
  };
};
