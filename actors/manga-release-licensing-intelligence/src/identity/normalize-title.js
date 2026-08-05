const transliterationReplacements = new Map([
    ['đ', 'd'],
    ['Đ', 'D'],
    ['×', 'x'],
]);

export const normalizeTitle = (value) => {
    if (typeof value !== 'string') return '';
    const replaced = [...value]
        .map((character) => transliterationReplacements.get(character) ?? character)
        .join('');
    return replaced
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('en-US')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
};

export const uniqueTitles = (titles) => {
    const seen = new Set();
    return titles.filter((title) => {
        const normalized = normalizeTitle(title);
        if (!normalized || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });
};
