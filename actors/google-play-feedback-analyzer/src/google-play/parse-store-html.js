import { load } from 'cheerio';

const parseRating = (card) => {
    const ariaLabel = card.find('[aria-label*="Rated"]').first().attr('aria-label') ?? '';
    const ariaRating = Number(ariaLabel.match(/Rated\s+(\d)/)?.[1] ?? 0);
    if (ariaRating >= 1 && ariaRating <= 5) return ariaRating;
    return card.find('.iXRFPc .Z1Dz7b').length || null;
};

const parseHelpfulCount = (card) => {
    const raw = card.find('[data-original-thumbs-up-count]').first().attr('data-original-thumbs-up-count');
    if (raw === undefined) return null;
    const count = Number(raw);
    return Number.isInteger(count) && count >= 0 ? count : null;
};

const parseReply = (card) => {
    const reply = card.find('.ocpBU').first();
    if (!reply.length) return null;
    return {
        present: true,
        replyDateText: reply.find('.I9Jtec').first().text().trim() || null,
        text: reply.find('.ras4vb').first().text().trim() || null,
    };
};

export const parseStoreHtml = (html, { appId, language, country }) => {
    const $ = load(String(html ?? ''));
    const reviews = [];
    const seenIds = new Set();

    $('header[data-review-id]').each((_, header) => {
        const reviewId = $(header).attr('data-review-id');
        if (!reviewId || seenIds.has(reviewId)) return;
        seenIds.add(reviewId);

        const card = $(header).closest('.EGFGHd');
        reviews.push({
            reviewId,
            appId,
            rating: parseRating(card),
            reviewDateText: card.find('.bp9Aid').first().text().trim() || null,
            text: card.find('.h3YV2d').first().text().trim() || null,
            helpfulCount: parseHelpfulCount(card),
            developerReply: parseReply(card),
            source: { language, country },
        });
    });

    return { reviews };
};
