import { createHash } from 'node:crypto';

import { normalizeTitle } from './normalize-title.js';
import { parseIsbn } from './parse-isbn.js';
import { parseVolumeAndEdition } from './parse-volume.js';

export const editionIdFor = (edition) => {
    const parsedIsbn = edition.isbn ? parseIsbn(edition.isbn) : null;
    const parsedVolume = parseVolumeAndEdition(edition.title ?? edition.volumeLabel ?? '');
    const identity = [
        edition.workId ?? '',
        String(edition.countryCode ?? '').toUpperCase(),
        String(edition.languageCode ?? '').toLowerCase(),
        edition.isbn13 ?? edition.isbn10 ?? parsedIsbn?.isbn13 ?? parsedIsbn?.isbn10 ?? `title:${normalizeTitle(edition.title ?? '')}`,
        normalizeTitle(edition.publisher ?? ''),
        edition.editionType ?? parsedVolume.editionType ?? 'unknown',
        edition.format ?? parsedVolume.format ?? 'unknown',
        edition.volumeNumber ?? parsedVolume.volumeNumber ?? '',
        edition.volumeRange ? `${edition.volumeRange.start}-${edition.volumeRange.end}` : '',
    ].join('|');
    const digest = createHash('sha256').update(identity).digest('hex').slice(0, 24);
    return `edition:${digest}`;
};
