import {
  domainOf,
  normalizeText,
  normalizeUrl,
} from "../normalization/index.js";

const priorityTerms = [
  "pricing",
  "prices",
  "admission",
  "tickets",
  "activities",
  "attractions",
  "play",
  "parties",
  "birthday",
  "booking",
  "book now",
  "opening",
  "faq",
  "rules",
  "facilities",
  "accessibility",
  "bảng giá",
  "giá vé",
  "hoạt động",
  "trò chơi",
  "sinh nhật",
  "đặt vé",
  "đặt chỗ",
  "giờ mở cửa",
  "quy định",
  "tiện ích",
  "câu hỏi",
];

export const selectPages = ({ homepage, links, maximum }) => {
  const domain = domainOf(homepage);
  const candidates = links
    .map((link) => ({
      url: normalizeUrl(link.url),
      score: priorityTerms.reduce(
        (sum, term) =>
          sum +
          Number(
            normalizeText(`${link.text} ${link.url}`).includes(
              normalizeText(term),
            ),
          ),
        0,
      ),
    }))
    .filter((link) => link.url && domainOf(link.url) === domain);
  return [
    ...new Set([
      normalizeUrl(homepage),
      ...candidates
        .sort((a, b) => b.score - a.score)
        .filter((link) => link.score)
        .map((link) => link.url),
    ]),
  ].slice(0, maximum);
};
