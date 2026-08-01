const COUNTER_NAMES = [
  "gamesRequested",
  "gamesProcessed",
  "gamesFailed",
  "reviewsRequested",
  "reviewsCollected",
  "reviewsPushed",
  "reviewsSkipped",
  "errors",
];

export const createRunStatistics = ({ now = () => Date.now() } = {}) => {
  const startedAt = now();
  const counters = Object.fromEntries(COUNTER_NAMES.map((name) => [name, 0]));
  return {
    increment(name, amount = 1) {
      if (!(name in counters)) counters[name] = 0;
      counters[name] = Math.max(0, counters[name] + Number(amount || 0));
    },
    set(name, value) {
      if (!(name in counters)) counters[name] = 0;
      counters[name] = Math.max(0, Number(value) || 0);
    },
    summary({ finishedAt = now() } = {}) {
      return {
        ...counters,
        runtimeSeconds: Math.max(0, (finishedAt - startedAt) / 1000),
      };
    },
  };
};
