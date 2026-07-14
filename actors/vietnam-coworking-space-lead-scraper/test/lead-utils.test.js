import { describe, expect, it } from 'vitest';

import {
    getDedupeKey,
    getLeadQuality,
    getLeadScore,
    resolveSearchConfig,
} from '../src/lead-utils.js';

const hotelConfig = {
    defaultKeyword: 'hotel',
    defaultLocation: 'Da Nang',
    multiSearch: {
        locationInputField: 'city',
        typeInputField: 'hotelTypes',
        maxResultsInputField: 'maxResultsPerType',
        searchQueryTemplate: '{type} {location} Vietnam',
    },
};

describe('lead utilities', () => {
    it('resolves canonical hotel fields', () => {
        expect(resolveSearchConfig({
            city: 'Da Nang',
            hotelTypes: ['resort'],
            maxResultsPerType: 7,
        }, hotelConfig)).toMatchObject({
            searchLocation: 'Da Nang',
            searchTypes: ['resort'],
            maxResults: 7,
        });
    });

    it('resolves city, hotelTypes, and maxResultsPerType from defaults and legacy aliases', () => {
        expect(resolveSearchConfig({
            location: 'Ho Chi Minh City',
            keyword: 'resort',
            maxResults: 12,
        }, hotelConfig)).toMatchObject({
            searchLocation: 'Ho Chi Minh City',
            searchTypes: ['resort'],
            maxResults: 12,
        });

        expect(resolveSearchConfig({}, hotelConfig)).toMatchObject({
            searchLocation: 'Da Nang',
            searchTypes: ['hotel'],
            maxResults: 20,
        });
    });

    it('marks a complete contact as high quality', () => {
        const score = getLeadScore({
            email: 'contact@hotel.test',
            website: 'https://hotel.test',
            phone: '+84 123 456 789',
            rating: '4.5',
            address: 'Da Nang',
            googleMapsUrl: 'https://maps.google.com/place/hotel',
        });

        expect(getLeadQuality(score)).toBe('high');
    });

    it('uses the Maps URL before the normalized name/address dedupe key', () => {
        expect(getDedupeKey({
            googleMapsUrl: 'https://maps.google.com/place/hotel',
            name: 'Hotel',
            address: 'Da Nang',
        })).toBe('url:https://maps.google.com/place/hotel');

        expect(getDedupeKey({ name: 'Hotel One', address: 'Da Nang' }))
            .toBe('name-address:hotel one|da nang');
    });
});
