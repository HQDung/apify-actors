import { ANALYSIS_SCHEMA_VERSION, createTaxonomyConfig } from '@project/feedback-analysis-core';

export const GAME_TOPICS = Object.freeze([
    'performance',
    'crashes_stability',
    'bugs',
    'balance',
    'gameplay',
    'controls_input',
    'matchmaking',
    'servers_network',
    'content',
    'progression_grind',
    'monetization',
    'ui_ux',
    'graphics_visuals',
    'audio',
    'modding',
    'anti_cheat',
    'accessibility',
    'localization',
    'steam_deck',
    'other',
]);

export const GAME_TAXONOMY = createTaxonomyConfig({
    topics: GAME_TOPICS,
    promptContext: 'public Steam game reviews describing gameplay, technical quality, and player experience',
});

const TOPIC_RULES = Object.freeze({
    performance:
        /\b(?:fps|frame rate|frames|stutter|stutters|stuttering|lag|laggy|slow|performance|optimization|optimisation|loading)\b/i,
    crashes_stability: /\b(?:crash|crashes|crashed|crashing|freeze|freezes|frozen|freezing|hang|hangs|unstable)\b/i,
    bugs: /\b(?:bug|bugs|glitch|glitches|broken|issue|issues|error|errors)\b/i,
    balance: /\b(?:balance|balanced|overpowered|underpowered|op|nerf|buff|unfair)\b/i,
    gameplay: /\b(?:gameplay|mechanic|mechanics|combat|mission|missions|level|levels|fun)\b/i,
    controls_input: /\b(?:controller|controls?|input|keyboard|mouse|gamepad|joystick|keybind|keybinds)\b/i,
    matchmaking: /\b(?:matchmaking|matchmaking|queue|queues|ranked|rank)\b/i,
    servers_network: /\b(?:server|servers|network|online|disconnect|disconnects|ping|latency|connection)\b/i,
    content: /\b(?:content|map|maps|character|characters|weapon|weapons|story|campaign|mode|modes)\b/i,
    progression_grind: /\b(?:progression|grind|grinding|grindy|unlock|unlocks|leveling|levelling|battle pass)\b/i,
    monetization:
        /\b(?:microtransaction|microtransactions|monetization|monetisation|pay[- ]to[- ]win|dlc|loot box|lootbox)\b/i,
    ui_ux: /\b(?:interface|menu|menus|ui|ux|hud|usability|user experience)\b/i,
    graphics_visuals: /\b(?:graphics|visuals?|texture|textures|lighting|resolution|art style)\b/i,
    audio: /\b(?:audio|sound|sounds|music|voice acting|voices)\b/i,
    modding: /\b(?:mod|mods|modding|workshop)\b/i,
    anti_cheat: /\b(?:cheat|cheating|cheaters|anti[- ]cheat|anticheat)\b/i,
    accessibility: /\b(?:accessibility|subtitles|colorblind|colourblind|blind mode|difficulty options)\b/i,
    localization:
        /\b(?:translation|translations|localization|localisation|language|languages|german|french|spanish)\b/i,
    steam_deck: /\b(?:steam deck|steamdeck|deck verified|deck)\b/i,
});

const REQUEST_PATTERNS = [
    /\bplease add\s+(.+)/i,
    /\badd\s+(.+)/i,
    /\b(?:wish|希望)\s+(?:there was|we had|for)\s+(.+)/i,
    /\bwould like\s+(.+)/i,
    /\bshould add\s+(.+)/i,
    /\b(?:need|needs)\s+(?:a|an|more)\s+(.+)/i,
];

const cleanSnippet = (value, limit = 240) =>
    String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, limit);

const requestTitle = (text) => {
    for (const pattern of REQUEST_PATTERNS) {
        const match = text.match(pattern);
        if (match?.[1])
            return cleanSnippet(match[1])
                .replace(/[.!?]+$/, '')
                .trim();
    }
    return null;
};

export const fallbackAnalyzeGameFeedback = ({ feedback, options = {} }) => {
    const text = String(feedback?.feedback?.text ?? '').trim();
    const isPositive = feedback?.feedback?.isPositive;
    const request = requestTitle(text);
    const topics = Object.entries(TOPIC_RULES)
        .filter(([, pattern]) => pattern.test(text))
        .map(([topic]) => topic);
    const featureRequest = request ? { title: request, description: request, requestedBy: 'player feedback' } : null;
    const issueTopics = topics.filter((topic) => !['content', 'gameplay'].includes(topic));
    let primaryFeedbackType = 'generalComplaint';
    if (request) primaryFeedbackType = 'featureRequest';
    else if (issueTopics.includes('crashes_stability')) primaryFeedbackType = 'stabilityIssue';
    else if (issueTopics.includes('performance')) primaryFeedbackType = 'performanceIssue';
    else if (issueTopics.length > 0) primaryFeedbackType = 'bugReport';
    else if (isPositive === true) primaryFeedbackType = 'positiveFeedback';
    else if (text.length < 10) primaryFeedbackType = 'nonActionable';
    const actionable = Boolean(request || issueTopics.length > 0);
    let sentiment = 'neutral';
    if (isPositive === true) sentiment = 'positive';
    else if (isPositive === false) sentiment = 'negative';
    let severity = 'unknown';
    if (request) severity = 'low';
    else if (topics.includes('crashes_stability')) severity = 'high';
    else if (actionable) severity = 'medium';
    const sentimentLabel = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
    const summary = text
        ? `${sentimentLabel} Steam recommendation: ${cleanSnippet(text, 180)}`
        : 'The feedback contains no usable text.';
    const issue = actionable && !request ? { title: cleanSnippet(text, 120), topics: issueTopics } : null;
    let actionabilityScore = 0.08;
    if (actionable) actionabilityScore = request ? 0.75 : 0.7;
    else if (text.length >= 30) actionabilityScore = 0.2;

    return {
        isActionableFeedback: actionable,
        actionabilityScore,
        primaryFeedbackType,
        feedbackTypes: [primaryFeedbackType],
        sentiment,
        severity,
        topics: topics.length > 0 ? topics : ['other'],
        summary,
        issue,
        featureRequest,
        positiveSignals: isPositive === true ? ['Steam player recommendation is positive'] : [],
        sourceLanguage: feedback?.feedback?.sourceLanguage ?? 'unknown',
        analysisLanguage: options.outputLanguage ?? 'english',
        originalTextPreserved: true,
        modelMetadata: {
            provider: 'deterministic-fallback',
            model: 'steam-game-taxonomy-v1',
            schemaVersion: ANALYSIS_SCHEMA_VERSION,
        },
    };
};
