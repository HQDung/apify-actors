# Steam Game Reviews & Player Feedback Analyzer — Technical Spike

Date: 2026-07-31

## Source selected

The public Steam Store `appreviews` endpoint is suitable for the collection layer:

`https://store.steampowered.com/appreviews/<appid>?json=1`

The public app-details endpoint is suitable for lightweight game metadata:

`https://store.steampowered.com/api/appdetails?appids=<appid>&l=english`

Reference: [Steamworks User Reviews - Get List](https://partner.steamgames.com/doc/store/getreviews?l=english&language=english).

## Observed behavior

- `filter=recent` returns reviews in creation-time order and is appropriate for cursor pagination. Steam documents `updated` similarly; `all` is helpfulness-ranked and may keep returning sliding-window results.
- The first review request uses `cursor=*`; subsequent requests use the returned cursor. Cursors contain characters such as `/` and `=` and must be URL-encoded by `URLSearchParams`.
- `num_per_page=3` returned three reviews in this probe. Steam documents a maximum of 100 per page.
- Responses returned HTTP 200 with `success: 1` for app IDs 730 (Counter-Strike 2) and 570 (Dota 2).
- Review records include recommendation ID, review text, Steam-indicated language, created/updated Unix timestamps, recommendation, helpful/funny vote counts, weighted score, comments, purchase/free/early-access flags, and author playtime fields.
- Author records also contain profile identifiers and names. The Actor should not preserve names, avatars, or profile URLs; it may retain a public source ID only when needed for review provenance.
- `language=vietnamese` returned records tagged by Steam as Vietnamese, but at least one returned text was English. The Actor must preserve Steam’s language code and must not infer language from text without labeling that as a separate detection signal.
- App details returned `success: true`, `steam_appid`, `name`, `type`, developers, and publishers for both probe apps.
- Four small requests completed successfully without an observed rate-limit response. This is not a rate-limit guarantee; the Actor will use bounded concurrency, retries only for transient failures, and configurable review limits.

## Fixtures

Sanitized response fixtures are in `test/fixtures/steam/`:

- `app-730-english-page.json`
- `app-730-vietnamese-page.json`
- `appdetails-730.json`

Profile names, URLs, avatars, and real Steam IDs were removed or replaced with placeholders. Review text in the Vietnamese fixture is representative rather than a retained profile record.

## Reproduction

From this directory:

```bash
node scripts/fetch-steam-fixture.mjs --app-id 730 --language english --pages 2 --reviews 3
node scripts/fetch-steam-fixture.mjs --app-id 730 --language vietnamese --pages 1 --reviews 3
```

The script performs bounded live requests and prints the response shape; it does not write credentials or personal profile data to the repository.

## Phase 0 decision

The raw collection implementation can proceed. It will isolate the Steam client, use `filter=recent` for bounded pagination, normalize numeric/string values defensively, and retain only the public review metadata needed by the handoff output contract. AI analysis remains deferred until the Phase 1 raw-output gate passes.
