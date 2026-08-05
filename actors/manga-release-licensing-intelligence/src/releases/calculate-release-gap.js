import { findLatestStandardRelease } from './find-latest-release.js';

const uniqueSources = (sources) => {
    const seen = new Set();
    return sources.filter((source) => {
        const key = `${source?.sourceName ?? ''}|${source?.sourceUrl ?? ''}`;
        if (!source?.sourceUrl || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export const calculateReleaseGap = ({ work, editions = [], sources = [] }) => {
    const originalLatestVolume = work?.originalLatestVolume
        ?? (work?.publicationStatus === 'finished' && Number.isInteger(work?.originalVolumeCount) ? work.originalVolumeCount : null);
    const localizedRelease = findLatestStandardRelease(editions);
    const localizedLatestVolume = localizedRelease?.volumeNumber ?? null;
    const originalSource = sources.find((source) => source.sourceType === 'metadata' && source.sourceUrl) ?? null;
    const localizedSource = localizedRelease?.sourceUrl
        ? {
              sourceType: 'edition',
              sourceName: localizedRelease.publisher ?? 'edition',
              sourceUrl: localizedRelease.sourceUrl,
              confidence: 'high',
          }
        : null;
    const provenance = uniqueSources([originalSource, localizedSource].filter(Boolean));

    if (!Number.isInteger(originalLatestVolume) || !Number.isInteger(localizedLatestVolume)) {
        return {
            calculated: false,
            originalLatestVolume,
            localizedLatestVolume,
            volumeGap: null,
            confidence: 'low',
            sources: provenance,
        };
    }
    return {
        calculated: true,
        originalLatestVolume,
        localizedLatestVolume,
        volumeGap: originalLatestVolume - localizedLatestVolume,
        confidence: originalSource && localizedSource ? 'high' : 'medium',
        sources: provenance,
    };
};
