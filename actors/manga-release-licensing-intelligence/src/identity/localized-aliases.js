import { normalizeTitle } from './normalize-title.js';

const vettedAliases = new Map([
    ['dao hai tac', 'one piece'],
    ['doremon', 'doraemon'],
    ['tham tu lung danh conan', 'detective conan'],
    ['bay vien ngoc rong', 'dragon ball'],
]);

export const addVettedLocalizedAlias = (queryTitle, work) => {
    const expectedCanonical = vettedAliases.get(normalizeTitle(queryTitle));
    if (!expectedCanonical || normalizeTitle(work.canonicalTitle) !== expectedCanonical) return work;
    const aliases = work.aliases ?? [];
    if (aliases.some((alias) => normalizeTitle(typeof alias === 'string' ? alias : alias.title) === normalizeTitle(queryTitle))) return work;
    return {
        ...work,
        aliases: [...aliases, {
            title: queryTitle,
            languageCode: 'vi',
            sourceName: 'vetted-localized-alias',
        }],
    };
};

export const isVettedLocalizedAlias = (queryTitle) => vettedAliases.has(normalizeTitle(queryTitle));
