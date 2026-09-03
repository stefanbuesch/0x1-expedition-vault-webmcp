// @ts-nocheck

const STOP_WORDS = new Set([
  'about','after','again','also','and','are','because','been','before','being','between','both','but','can','could','does','each','from','have','into','more','most','other','over','same','should','some','such','than','that','their','there','these','they','this','those','through','under','very','what','when','where','which','while','with','would','your','you','the','for','not','how','why','its','our','out','use','using','used','will','may','might','then'
]);

const CAUSAL_WORDS = ['because', 'therefore', 'causes', 'cause', 'leads to', 'results in', 'drives', 'enables', 'prevents', 'increases', 'decreases', 'changes', 'produces'];

function cleanText(value = '') {
  return String(value).replace(/\r/g, '').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function slug(value = '') {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'course';
}

function hash(value = '') {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function extractYoutubeVideoId(url = '') {
  const raw = String(url).trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0]?.slice(0, 11) || '';
    if (host.endsWith('youtube.com')) {
      if (parsed.pathname === '/watch') return (parsed.searchParams.get('v') || '').slice(0, 11);
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(parts[0])) return (parts[1] || '').slice(0, 11);
    }
  } catch {
    return '';
  }
  return '';
}

function sentences(text) {
  return cleanText(text).replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).map((row) => row.trim()).filter((row) => row.length >= 28).slice(0, 60);
}

function keywordRows(text, title) {
  const counts = new Map();
  const source = `${title} ${text}`.toLowerCase().match(/[a-zà-ž][a-zà-ž0-9-]{2,}/gi) || [];
  for (const token of source) {
    const word = token.toLowerCase();
    if (STOP_WORDS.has(word) || /^https?$/.test(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, 10).map(([word]) => word);
}

function shorten(text, max = 190) {
  const value = cleanText(text);
  return value.length <= max ? value : `${value.slice(0, max - 1).trim()}…`;
}

function mutateClaim(sentence, keyword) {
  const base = sentence.replace(/[.!?]+$/, '');
  if (keyword && new RegExp(`\\b${keyword}\\b`, 'i').test(base)) {
    return base.replace(new RegExp(`\\b${keyword}\\b`, 'i'), `the absence of ${keyword}`) + '.';
  }
  return `The material argues that the opposite of this claim is generally true: ${base}.`;
}

function sourceType(url, videoId, text) {
  if (videoId) return 'YouTube';
  if (url) return 'Linked source';
  if (text) return 'Text material';
  return 'Topic brief';
}

export function generateKnowledgePackFromMaterial({ title = '', content = '', url = '', sourceMeta = {} } = {}) {
  const rawText = cleanText(content);
  const videoId = extractYoutubeVideoId(url);
  const cleanTitle = cleanText(title) || (videoId ? 'YouTube Learning Expedition' : 'Custom Learning Expedition');
  const rows = sentences(rawText);
  const keywords = keywordRows(rawText, cleanTitle);
  const thesis = cleanText(sourceMeta.summary) || rows[0] || `Build a precise working model of ${cleanTitle}, then explain its mechanisms without relying on memorized phrasing.`;
  const causal = rows.find((row) => CAUSAL_WORDS.some((word) => row.toLowerCase().includes(word))) || rows[1] || thesis;
  const evidence = rows[2] || rows[1] || thesis;
  const boundary = rows[3] || rows[2] || `A useful model of ${cleanTitle} must state where it stops working.`;
  const k1 = keywords[0] || cleanTitle.split(/\s+/)[0] || 'system';
  const k2 = keywords[1] || 'mechanism';
  const k3 = keywords[2] || 'evidence';
  const k4 = keywords[3] || 'constraint';
  const k5 = keywords[4] || 'outcome';
  const embed = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&controls=1&playsinline=1&modestbranding=1` : '';
  const base = slug(cleanTitle);
  const id = (suffix) => `${base}-${suffix}`;
  const makeRoom = ({ refId, title: roomTitle, subtitle, nodeType, beliefDelta, glyph, edges, map, parts }) => ({
    refId,
    title: roomTitle,
    subtitle,
    nodeType,
    status: refId === id('source') ? 'available' : 'locked',
    mastery: 0,
    beliefDelta,
    glyph,
    edges,
    map,
    parts: parts.map((part, index) => ({ id: `${refId}-p${index + 1}`, ...part })),
    part: { id: `${refId}-p1`, ...parts[0] }
  });

  const sourceParts = videoId
    ? [
        {
          type: 'video', title: cleanTitle, videoUrl: embed, sourceLabel: url,
          prompt: rawText ? shorten(thesis, 220) : `Watch for the central claim, the mechanism that supports it, and one concrete piece of evidence about ${cleanTitle}.`
        },
        {
          type: 'recall',
          question: `Without replaying the source, reconstruct the central claim of ${cleanTitle} and name the mechanism that makes it plausible.`,
          expected: [k1, k2],
          hint: 'Do not summarize chronologically. Rebuild the model from memory.',
          cognitionCheck: { kind: 'retrieval', sourceHidden: true }
        }
      ]
    : [
        {
          type: 'recall',
          question: `State the central problem or claim in ${cleanTitle} in your own words. Then identify what would count as evidence for it.`,
          expected: [k1, k2], hint: shorten(thesis, 180)
        },
        {
          type: 'dialogue',
          question: `A skeptical reviewer says your summary of ${cleanTitle} is merely vocabulary. Defend the underlying mechanism in two causal steps.`,
          expected: [k1, k2],
          probes: ['What changes first?', 'Why must the second step follow?']
        }
      ];

  const thesisQuiz = {
    type: 'quiz',
    question: rawText ? 'Which statement is most directly supported by the supplied material?' : `Which learning move best establishes real understanding of ${cleanTitle}?`,
    options: rawText ? [
      shorten(thesis, 210),
      shorten(mutateClaim(thesis, k1), 210),
      `A repeated correlation involving ${k2} is sufficient proof of causation.`,
      'The topic can be mastered without testing any mechanism or boundary condition.'
    ] : [
      'Build a causal model, test it against examples, then explain where it can fail.',
      'Memorize terminology before considering mechanisms.',
      'Treat the first plausible explanation as correct.',
      'Avoid counterexamples because they reduce confidence.'
    ],
    correctIndex: 0,
    explanation: rawText ? `This option preserves the source's central claim: ${shorten(thesis, 170)}` : 'Mastery requires a model that survives transfer, counterexamples, and causal explanation.'
  };

  const evidenceQuiz = {
    type: 'quiz',
    question: 'Which observation would be the strongest evidence that the proposed mechanism is doing real explanatory work?',
    options: [
      shorten(evidence, 190),
      `The term “${k1}” appears frequently in the source.`,
      `A reader reports that ${cleanTitle} feels intuitive.`,
      `The conclusion is repeated without changing any condition.`
    ],
    correctIndex: 0,
    explanation: `The strongest evidence is the source-linked observation: ${shorten(evidence, 155)}`
  };

  const rooms = [
    makeRoom({
      refId: id('source'), title: videoId ? 'Source Chamber' : 'Source Orientation',
      subtitle: `${sourceType(url, videoId, rawText)} · acquire then reconstruct`, nodeType: videoId ? 'video' : 'recall', beliefDelta: 5, glyph: '01',
      map: { row: 0, column: 0 }, edges: [{ targetRefId: id('review'), type: 'NEXT' }], parts: sourceParts
    }),
    makeRoom({
      refId: id('review'), title: 'Thesis Gate', subtitle: 'Separate claim, mechanism, and distractor', nodeType: 'quiz', beliefDelta: 7, glyph: '02',
      map: { row: 1, column: 0 }, edges: [
        { targetRefId: id('mechanism'), type: 'OPTION' },
        { targetRefId: id('evidence'), type: 'OPTION' }
      ],
      parts: [
        thesisQuiz,
        {
          type: 'recall',
          question: `Explain why the correct thesis about ${cleanTitle} is stronger than the most plausible distractor.`,
          expected: [k1, k2], hint: 'Contrast mechanisms, not wording.'
        }
      ]
    }),
    makeRoom({
      refId: id('mechanism'), title: 'Mechanism Lane', subtitle: 'Reconstruct the causal machinery', nodeType: 'recall', beliefDelta: 10, glyph: '03A',
      map: { row: 2, column: -1 }, edges: [{ targetRefId: id('transfer'), type: 'BRANCH' }],
      parts: [
        {
          type: 'recall',
          question: `Explain a causal chain for ${cleanTitle}: what changes first, why does the next step follow, and what observable outcome should result?`,
          expected: [k1, k2, k3].filter(Boolean), sourceClaim: shorten(causal, 240),
          hint: rawText ? `Anchor your explanation to this source claim without copying it: “${shorten(causal, 170)}”` : 'Use explicit arrows: condition → mechanism → consequence → observable evidence.'
        },
        {
          type: 'dialogue',
          question: `I claim ${k2} is only correlated with ${k1}, so your causal story is unjustified. Refute me without appealing to authority.`,
          expected: [k1, k2, k3], probes: ['Name an intervention or changed condition.', 'State the predicted downstream effect.'],
          cognitionCheck: { kind: 'causal intervention', sourceHidden: true }
        }
      ]
    }),
    makeRoom({
      refId: id('evidence'), title: 'Evidence Lane', subtitle: 'Prove the model earns its confidence', nodeType: 'quiz', beliefDelta: 9, glyph: '03B',
      map: { row: 2, column: 1 }, edges: [{ targetRefId: id('transfer'), type: 'BRANCH' }],
      parts: [
        evidenceQuiz,
        {
          type: 'recall',
          question: `Separate observation from inference in ${cleanTitle}. What did the source actually establish, and what are you adding to the model?`,
          expected: [k1, k3], hint: 'Name the observation first. Then mark every inferential step you are adding yourself.',
          cognitionCheck: { kind: 'source / inference separation', sourceHidden: true }
        }
      ]
    }),
    makeRoom({
      refId: id('transfer'), title: 'Transfer Arena', subtitle: 'Apply the model under changed conditions', nodeType: 'case-study', beliefDelta: 12, glyph: '04',
      map: { row: 3, column: 0 }, edges: [
        { targetRefId: id('prep'), type: 'OPTION' },
        { targetRefId: id('pressure'), type: 'OPTION' }
      ],
      parts: [
        {
          type: 'case-study',
          question: `Change one important condition in ${cleanTitle}. Predict what should change, what should remain invariant, and which observation would falsify your prediction.`,
          expected: [k1, k2, k4], hint: 'Use the learned model, not the source wording. Commit to the prediction before naming the falsifier.',
          cognitionCheck: { kind: 'blind transfer', sourceHidden: true }
        },
        {
          type: 'quiz',
          question: 'Which answer is a genuine falsification test rather than another confirmation?',
          options: [
            `Change a boundary condition and predict a result that would count against the ${k2} mechanism.`,
            `Repeat the original example until it feels familiar.`,
            `Search only for examples containing ${k1}.`,
            'Treat every surprising outcome as measurement error.'
          ],
          correctIndex: 0,
          explanation: 'A falsification test exposes the mechanism to a changed condition with a precommitted failure criterion.',
          cognitionCheck: { kind: 'falsification discrimination', sourceHidden: false }
        }
      ]
    }),
    makeRoom({
      refId: id('prep'), title: 'Reconstruction Camp', subtitle: 'Repair the weakest link before the boss', nodeType: 'recall', beliefDelta: 8, glyph: '05A',
      map: { row: 4, column: -1 }, edges: [{ targetRefId: id('defense'), type: 'BRANCH' }],
      parts: [
        {
          type: 'recall',
          question: `Reconstruct ${cleanTitle} from five anchors: claim, mechanism, evidence, boundary condition, and predicted outcome.`,
          expected: [k1, k2, k3, k4, k5], hint: 'This is retrieval, not rereading. Compress the whole model.'
        }
      ]
    }),
    makeRoom({
      refId: id('pressure'), title: 'Adversarial Check', subtitle: 'Choose the harder lane into the final', nodeType: 'dialogue', beliefDelta: 11, glyph: '05B',
      map: { row: 4, column: 1 }, edges: [{ targetRefId: id('defense'), type: 'BRANCH' }],
      parts: [
        {
          type: 'dialogue',
          question: `A critic says your model of ${cleanTitle} explains everything after the fact and therefore predicts nothing. Answer the criticism.`,
          expected: [k2, k4, k5], probes: ['Commit to a prediction before the observation.', 'Name one result that would lower your confidence.'],
          cognitionCheck: { kind: 'adversarial prediction', sourceHidden: true }
        },
        {
          type: 'recall',
          question: `Now state the strongest failure mode or boundary condition you learned for ${cleanTitle}.`,
          expected: [k4], hint: 'State the boundary from memory. Do not reopen the source.',
          cognitionCheck: { kind: 'boundary retrieval', sourceHidden: true }
        }
      ]
    }),
    makeRoom({
      refId: id('defense'), title: 'Mastery Defense', subtitle: 'Final boss · explain, challenge, defend', nodeType: 'boss', beliefDelta: 16, glyph: '06',
      map: { row: 5, column: 0 }, edges: [],
      parts: [
        {
          type: 'boss',
          question: `BOSS // Defend your model of ${cleanTitle}. Include the main claim, causal mechanism, strongest evidence, one boundary condition or failure mode, and one test that could change your mind.`,
          expected: [k1, k2, k3, k4, k5],
          checklist: ['central claim', 'causal mechanism', 'source-grounded evidence', 'boundary/failure mode', 'falsification test'],
          hint: 'Distinguish what the material says, what you inferred, and what evidence would force a revision.',
          cognitionCheck: { kind: 'integrative defense', sourceHidden: true }
        }
      ]
    })
  ];

  return {
    id: `pack-${base}-${hash(`${cleanTitle}|${rawText}|${url}`).slice(0, 8).toLowerCase()}`,
    title: cleanTitle,
    seed: `0x${hash(`${url}|${rawText}|${cleanTitle}`).slice(0, 6)}`,
    goal: shorten(thesis, 260),
    threshold: 65,
    template: 'standard-branching',
    estimatedMinutes: 20,
    source: {
      type: sourceType(url, videoId, rawText),
      url: String(url || ''),
      videoId,
      hasText: Boolean(rawText),
      characterCount: rawText.length,
      provenance: sourceMeta.source || sourceMeta.provenance || (videoId ? 'youtube' : url ? 'url' : rawText ? 'pasted-text' : 'topic'),
      contentType: sourceMeta.contentType || '',
      transcriptStatus: sourceMeta.transcriptStatus || '',
      transcriptSegments: Number(sourceMeta.transcriptSegments || 0),
      captionLanguage: sourceMeta.captionLanguage || '',
      author: sourceMeta.author || '',
      lengthSeconds: Number(sourceMeta.lengthSeconds || 0) || null,
      extractedCharacters: Number(sourceMeta.extractedCharacters || rawText.length || 0),
      sourceTitle: sourceMeta.sourceTitle || sourceMeta.title || '',
      summary: sourceMeta.summary || ''
    },
    concepts: keywords,
    rooms
  };
}
