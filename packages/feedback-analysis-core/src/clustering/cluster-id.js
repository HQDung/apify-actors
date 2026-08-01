const slugify = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export const createClusterId = ({ productId, feedbackType, title }) => `issue-${slugify(productId)}-${slugify(feedbackType)}-${slugify(title)}`;
