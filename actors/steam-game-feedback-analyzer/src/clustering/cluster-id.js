const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export const createClusterId = ({ appId, feedbackType, title }) =>
  `issue-${appId}-${slugify(feedbackType)}-${slugify(title)}`;
