const marketCodeFor = (snapshot) => snapshot?.marketCode
    ?? `${snapshot?.market?.countryCode ?? ''}-${snapshot?.market?.languageCode ?? ''}`;

const setOf = (values) => new Set((values ?? []).filter(Boolean));

const change = (type, current, values = {}) => ({
    changeType: type,
    workId: current.work?.workId ?? null,
    marketCode: marketCodeFor(current),
    ...values,
});

export const compareSnapshots = (previous, current) => {
    if (!previous || !current) return [];
    const changes = [];
    const added = new Set();
    const push = (value) => {
        const key = JSON.stringify([value.changeType, value.editionId ?? null, value.offerId ?? null, value.oldValue ?? null, value.newValue ?? null]);
        if (!added.has(key)) {
            added.add(key);
            changes.push(value);
        }
    };

    const previousLicense = previous.license ?? {};
    const currentLicense = current.license ?? {};
    const licensedStatuses = new Set(['licensed', 'licenseSignalFound']);
    if (!licensedStatuses.has(previousLicense.status) && licensedStatuses.has(currentLicense.status)) {
        push(change('newLicenseSignal', current, { oldValue: previousLicense.status ?? 'unknown', newValue: currentLicense.status, sourceUrl: currentLicense.sourceUrl ?? null }));
    }
    if (previousLicense.localPublisher && currentLicense.localPublisher && previousLicense.localPublisher !== currentLicense.localPublisher) {
        push(change('publisherChanged', current, { oldValue: previousLicense.localPublisher, newValue: currentLicense.localPublisher, sourceUrl: currentLicense.sourceUrl ?? null }));
    }

    const previousLinks = setOf((previous.officialAvailability?.links ?? []).map((link) => link.url));
    const currentLinks = setOf((current.officialAvailability?.links ?? []).map((link) => link.url));
    for (const url of currentLinks) if (!previousLinks.has(url)) push(change('newOfficialReadingLink', current, { newValue: url }));
    for (const url of previousLinks) if (!currentLinks.has(url)) push(change('officialReadingRemoved', current, { oldValue: url }));

    const previousLatest = previous.localizedRelease?.latestVolumeNumber ?? null;
    const currentLatest = current.localizedRelease?.latestVolumeNumber ?? null;
    if (Number.isInteger(currentLatest) && (!Number.isInteger(previousLatest) || currentLatest > previousLatest)) {
        push(change('newLocalizedVolume', current, { oldValue: previousLatest, newValue: currentLatest }));
    }
    if (previousLatest === currentLatest
        && previous.localizedRelease?.latestReleaseDate
        && current.localizedRelease?.latestReleaseDate
        && previous.localizedRelease.latestReleaseDate !== current.localizedRelease.latestReleaseDate) {
        push(change('releaseDateChanged', current, { oldValue: previous.localizedRelease.latestReleaseDate, newValue: current.localizedRelease.latestReleaseDate }));
    }

    const previousEditions = new Map((previous.editions ?? []).filter((edition) => edition.editionId).map((edition) => [edition.editionId, edition]));
    const currentEditions = new Map((current.editions ?? []).filter((edition) => edition.editionId).map((edition) => [edition.editionId, edition]));
    const previousMaxVolume = Math.max(0, ...[...previousEditions.values()].map((edition) => edition.volumeNumber).filter(Number.isInteger));
    let volumeAlreadyReported = changes.some((item) => item.changeType === 'newLocalizedVolume');
    for (const [editionId, edition] of currentEditions) {
        const oldEdition = previousEditions.get(editionId);
        if (!oldEdition) {
            if (Number.isInteger(edition.volumeNumber) && edition.volumeNumber > previousMaxVolume && !volumeAlreadyReported) {
                push(change('newLocalizedVolume', current, { editionId, newValue: edition.volumeNumber, sourceUrl: edition.sourceUrl ?? null }));
                volumeAlreadyReported = true;
            } else {
                push(change('newEditionDiscovered', current, { editionId, newValue: edition.volumeNumber ?? edition.volumeLabel ?? null, sourceUrl: edition.sourceUrl ?? null }));
            }
        } else if (oldEdition.releaseDate && edition.releaseDate && oldEdition.releaseDate !== edition.releaseDate) {
            push(change('releaseDateChanged', current, { editionId, oldValue: oldEdition.releaseDate, newValue: edition.releaseDate, sourceUrl: edition.sourceUrl ?? null }));
        }
    }

    const offerKey = (offer) => offer.offerId ?? `${offer.providerName ?? ''}|${offer.editionId ?? ''}|${offer.productUrl ?? ''}`;
    const previousOffers = new Map((previous.offers ?? []).map((offer) => [offerKey(offer), offer]));
    const currentOffers = new Map((current.offers ?? []).map((offer) => [offerKey(offer), offer]));
    for (const [key, offer] of currentOffers) {
        const oldOffer = previousOffers.get(key);
        if (!oldOffer) {
            push(change('newRetailOffer', current, { offerId: offer.offerId ?? key, editionId: offer.editionId ?? null, newValue: offer.productUrl ?? null }));
            continue;
        }
        if (Number.isFinite(oldOffer.price) && Number.isFinite(offer.price) && oldOffer.price !== offer.price && oldOffer.currency === offer.currency) {
            push(change(offer.price > oldOffer.price ? 'priceIncreased' : 'priceDecreased', current, {
                offerId: offer.offerId ?? key,
                editionId: offer.editionId ?? null,
                oldValue: { price: oldOffer.price, currency: oldOffer.currency },
                newValue: { price: offer.price, currency: offer.currency },
            }));
        }
        if (oldOffer.stockStatus && offer.stockStatus && oldOffer.stockStatus !== offer.stockStatus) {
            push(change('stockChanged', current, {
                offerId: offer.offerId ?? key,
                editionId: offer.editionId ?? null,
                oldValue: oldOffer.stockStatus,
                newValue: offer.stockStatus,
            }));
            if (offer.stockStatus === 'preorder' && oldOffer.stockStatus !== 'preorder') {
                push(change('preorderOpened', current, { offerId: offer.offerId ?? key, editionId: offer.editionId ?? null }));
            }
        }
    }
    return changes;
};
