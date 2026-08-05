const typeFor = (text) => {
    if (/\bbox\s*set\b/i.test(text)) return 'boxSet';
    if (/\bomnibus\b/i.test(text)) return 'omnibus';
    if (/\bdeluxe\b|\bhardcover edition\b/i.test(text)) return 'deluxe';
    if (/\bcollector(?:'s)?\b/i.test(text)) return 'collector';
    if (/\bspecial edition\b|\blimited edition\b/i.test(text)) return 'special';
    return 'standard';
};

const formatFor = (text) => {
    if (/\b(?:ebook|e-book|digital)\b/i.test(text)) return 'ebook';
    if (/\bhardcover\b/i.test(text)) return 'hardcover';
    if (/\b(?:paperback|softcover)\b/i.test(text)) return 'paperback';
    if (/\bsubscription\b/i.test(text)) return 'subscription';
    if (/\bweb(?:toon|comic)?\b/i.test(text)) return 'web';
    return 'unknown';
};

const rangeFor = (text) => {
    const match = text.match(/\bvol(?:umes?|s?)?\.?\s*0*(\d+)\s*(?:-|–|—|to|&)\s*0*(\d+)/i);
    return match ? { start: Number(match[1]), end: Number(match[2]) } : null;
};

const numberFor = (text, range) => {
    const labeled = text.match(/\b(?:vol(?:ume)?|tập)\.?\s*0*(\d+)/i);
    if (labeled) return Number(labeled[1]);
    if (range) return range.start;
    const numbers = [...text.matchAll(/(?:^|\D)(\d{1,3})(?=\D|$)/g)].map((match) => Number(match[1]));
    return numbers.length ? numbers[numbers.length - 1] : null;
};

export const parseVolumeAndEdition = (value) => {
    const volumeLabel = String(value ?? '').trim() || null;
    const range = rangeFor(volumeLabel ?? '');
    return {
        volumeNumber: numberFor(volumeLabel ?? '', range),
        volumeLabel,
        editionType: typeFor(volumeLabel ?? ''),
        format: formatFor(volumeLabel ?? ''),
        volumeRange: range,
    };
};
