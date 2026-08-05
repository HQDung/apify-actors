const excludedTitle = /\b(?:art\s*book|spin[- ]?off|guide book|novel|character book)\b/i;

export const findLatestStandardRelease = (editions = []) => {
    return editions
        .filter((edition) => edition?.editionType === 'standard')
        .filter((edition) => Number.isInteger(edition.volumeNumber) && edition.volumeNumber > 0)
        .filter((edition) => !excludedTitle.test(edition.sourceTitle ?? edition.volumeLabel ?? ''))
        .sort((left, right) => right.volumeNumber - left.volumeNumber)[0] ?? null;
};

export { excludedTitle };
