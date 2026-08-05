import { editionIdFor } from './edition-id.js';
import { parseIsbn } from './parse-isbn.js';
import { parseVolumeAndEdition } from './parse-volume.js';

export const normalizeEdition = (input) => {
    const parsed = parseVolumeAndEdition(input.title ?? input.volumeLabel ?? '');
    const isbn = input.isbn ? parseIsbn(input.isbn) : {
        isbn10: input.isbn10 ?? null,
        isbn13: input.isbn13 ?? null,
    };
    if (input.isbn && !isbn) {
        const error = new Error(`Invalid ISBN for ${input.title ?? 'edition'}.`);
        error.code = 'INVALID_ISBN';
        throw error;
    }
    const edition = {
        editionId: null,
        workId: input.workId,
        countryCode: input.countryCode ?? null,
        languageCode: input.languageCode ?? null,
        publisher: input.publisher ?? null,
        imprint: input.imprint ?? null,
        volumeNumber: input.volumeNumber ?? parsed.volumeNumber,
        volumeLabel: input.volumeLabel ?? parsed.volumeLabel,
        editionType: input.editionType ?? parsed.editionType,
        format: input.format ?? parsed.format,
        isbn10: isbn?.isbn10 ?? null,
        isbn13: isbn?.isbn13 ?? null,
        releaseDate: input.releaseDate ?? null,
        volumeRange: input.volumeRange ?? parsed.volumeRange,
        sourceTitle: input.title ?? null,
        sourceUrl: input.productUrl ?? input.sourceUrl ?? null,
    };
    edition.editionId = editionIdFor(edition);
    return edition;
};
