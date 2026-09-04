// @ts-nocheck
// Shared semantic checkpoint evaluation for both human and WebMCP submissions.
// Text challenges fail closed when a curriculum part has no semantic targets;
// verbosity alone is never treated as evidence of understanding.
const CAUSAL_TYPES = new Set(['dialogue', 'case-study', 'boss']);

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}

function targetTokens(target = '') {
  return [...new Set(normalize(target).split(/[^a-z0-9-]+/).filter((token) => token.length > 3))];
}

export function evaluateTextCheckpoint({ text = '', expected = [], prompt = '', type = 'recall', roomId = '', isBoss = false, sourceHidden = false } = {}) {
  const source = normalize(text);
  if (!source) return { success: false, configured: true, score: 0, wordCount: 0, causalMarkers: 0, detail: 'Empty solution refused.' };

  const targets = Array.isArray(expected) ? expected.filter(Boolean) : [];
  if (!targets.length) {
    return {
      success: false,
      configured: false,
      score: 0,
      wordCount: source.split(/\s+/).filter(Boolean).length,
      causalMarkers: 0,
      detail: 'Checkpoint is missing semantic targets; completion refused.'
    };
  }

  const promptTokens = new Set(targetTokens(prompt));
  const targetScores = [];
  for (const target of targets) {
    const tokens = targetTokens(target);
    if (!tokens.length) {
      if (!sourceHidden) targetScores.push(source.includes(normalize(target)) ? 1 : 0);
      continue;
    }
    const scoringTokens = sourceHidden ? tokens.filter((token) => !promptTokens.has(token)) : tokens;
    if (!scoringTokens.length) continue;
    const hits = scoringTokens.filter((token) => source.includes(token)).length;
    targetScores.push(hits / scoringTokens.length);
  }
  if (!targetScores.length) {
    return {
      success: false,
      configured: false,
      score: 0,
      wordCount: source.split(/\s+/).filter(Boolean).length,
      causalMarkers: 0,
      detail: sourceHidden ? 'Hidden checkpoint has no novel semantic targets; completion refused.' : 'Checkpoint has no scorable semantic targets; completion refused.'
    };
  }
  const score = targetScores.reduce((sum, value) => sum + value, 0) / targetScores.length;
  const wordCount = source.split(/\s+/).filter(Boolean).length;
  const causalMarkers = (source.match(/\b(because|therefore|thus|causes?|caused|leads?|led|results?|resulted|mechanism|evidence|predict|falsif|opposes?|reinforc|consequen)\w*/g) || []).length;
  const requiresCausality = isBoss || CAUSAL_TYPES.has(type) || roomId.includes('causal') || roomId.includes('transfer');
  const minimumWords = isBoss ? 24 : requiresCausality ? 12 : 8;
  const success = score >= 0.6 && wordCount >= minimumWords && (!requiresCausality || causalMarkers >= 1);

  const coverage = Math.round(score * 100);
  const constraints = [];
  if (wordCount < minimumWords) constraints.push(`minimum ${minimumWords} words`);
  if (requiresCausality && causalMarkers < 1) constraints.push('explicit causal reasoning');
  const detail = constraints.length
    ? `Semantic coverage ${coverage}%. Missing ${constraints.join(' and ')}.`
    : `${requiresCausality ? 'Causal' : 'Semantic'} coverage ${coverage}%.`;

  return { success, configured: true, score, wordCount, causalMarkers, detail };
}
