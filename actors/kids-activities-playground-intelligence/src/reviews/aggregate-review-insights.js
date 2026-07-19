import { classifyReview } from "./classify-review.js";

export const aggregateReviewInsights = (reviews = []) => {
  const aggregate = new Map();
  reviews.flatMap(classifyReview).forEach(({ topic, sentiment }) => {
    const value = aggregate.get(topic) ?? {
      positive: 0,
      negative: 0,
      mixed: 0,
      neutral: 0,
    };
    value[sentiment]++;
    aggregate.set(topic, value);
  });
  const entries = [...aggregate.entries()].map(([topic, counts]) => {
    let sentiment = "neutral";
    if (counts.positive > counts.negative) sentiment = "positive";
    else if (counts.negative > counts.positive) sentiment = "negative";
    else if (counts.mixed) sentiment = "mixed";
    return {
      topic,
      mentionCount: Object.values(counts).reduce((a, b) => a + b, 0),
      sentiment,
    };
  });
  const sentimentFor = (topic) =>
    entries.find((entry) => entry.topic === topic)?.sentiment ?? "unknown";
  let overallSentiment = "unknown";
  if (entries.some((entry) => entry.sentiment === "positive"))
    overallSentiment = "positive";
  else if (entries.length) overallSentiment = "neutral";
  return {
    reviewsAnalyzed: reviews.length,
    overallSentiment,
    positiveTopics: entries
      .filter((entry) => entry.sentiment === "positive")
      .map(({ topic, mentionCount }) => ({ topic, mentionCount })),
    negativeTopics: entries
      .filter((entry) => entry.sentiment === "negative")
      .map(({ topic, mentionCount }) => ({ topic, mentionCount })),
    cleanlinessSentiment: sentimentFor("cleanliness"),
    safetyReviewSentiment: sentimentFor("safety"),
    staffSentiment: sentimentFor("staff"),
    valueForMoneySentiment: sentimentFor("value_for_money"),
  };
};
