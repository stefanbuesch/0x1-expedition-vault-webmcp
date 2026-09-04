// @ts-nocheck
import { json } from '@sveltejs/kit';
import { lookup } from 'node:dns/promises';
import { extractText, getDocumentProxy } from 'unpdf';
import { fetchTranscript, toPlainText } from 'youtube-transcript-plus';
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_TEXT = 180_000;
const CACHE_TTL = 15 * 60_000;
const CACHE_LIMIT = 24;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be']);
const extractionCache = new Map();

function cachedExtraction(key) {
  const entry = extractionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL) {
    extractionCache.delete(key);
    return null;
  }
  extractionCache.delete(key);
  extractionCache.set(key, entry);
  return entry.value;
}

function cacheExtraction(key, value) {
  extractionCache.delete(key);
  extractionCache.set(key, { at: Date.now(), value });
  while (extractionCache.size > CACHE_LIMIT) extractionCache.delete(extractionCache.keys().next().value);
}

async function readLimitedBytes(response, limit = MAX_BYTES, message = 'Source is larger than the ingestion limit.') {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > limit) throw new Error(message);
  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > limit) throw new Error(message);
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error(message);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock?.();
  }
  return Buffer.concat(chunks, total);
}

function youtubeVideoId(raw = '') {
  try {
    const url = new URL(String(raw));
    const host = url.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host)) return '';
    if (host.endsWith('youtu.be')) return url.pathname.split('/').filter(Boolean)[0]?.slice(0, 11) || '';
    if (url.pathname === '/watch') return (url.searchParams.get('v') || '').slice(0, 11);
    const parts = url.pathname.split('/').filter(Boolean);
    if (['embed', 'shorts', 'live'].includes(parts[0])) return (parts[1] || '').slice(0, 11);
    return '';
  } catch {
    return '';
  }
}

function balancedJsonAfter(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = source.indexOf('{', markerIndex + marker.length);
  if (start < 0) return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(source.slice(start, index + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function isPrivateIp(address = '') {
  const value = String(address).toLowerCase();
  if (value === '::1' || value.startsWith('fe80:') || value.startsWith('fc') || value.startsWith('fd')) return true;
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

async function assertPublicUrl(raw) {
  const url = new URL(String(raw));
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only public http(s) URLs are supported.');
  if (url.username || url.password) throw new Error('Credential-bearing URLs are not allowed.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) throw new Error('Private-network URLs are not allowed.');
  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateIp(record.address))) throw new Error('Private-network URLs are not allowed.');
  return url;
}

function decodeEntities(value = '') {
  const named = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, token) => {
    if (token[0] === '#') {
      const hex = token[1]?.toLowerCase() === 'x';
      const number = parseInt(token.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : ' ';
    }
    return named[token.toLowerCase()] ?? ' ';
  });
}

function extractHtml(html = '') {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeEntities(String(titleMatch?.[1] || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const cleaned = html
    .replace(/<(script|style|svg|noscript|template|nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/article|\/section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const text = decodeEntities(cleaned)
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT);
  return { title, text };
}

function youtubeDescriptionSummary(description = '', title = '') {
  const blocked = /^(courses on|watch the next|missed the previous|about |subscribe|follow |support |download |learn more|http|www\.)/i;
  const candidates = String(description)
    .split(/\n+/)
    .map((line) => decodeEntities(line).replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 32 && !blocked.test(line));
  const selected = candidates.find((line) => /\b(explain|show|demonstrat|because|cause|how|why|mechanism|effect|result|learn)\w*/i.test(line)) || candidates[0] || '';
  const cleaned = selected.replace(/\s+Created by\b.*$/i, '').trim();
  return (cleaned || `Build and test a causal model of ${title}.`).slice(0, 420);
}

async function fetchYoutubeMetadata(raw) {
  const videoId = youtubeVideoId(raw);
  if (!videoId) throw new Error('Invalid YouTube URL.');
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  let oembed = {};
  try {
    const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`, {
      signal: AbortSignal.timeout(6_000),
      headers: { 'user-agent': '0x1-Expedition-Vault/1.0' }
    });
    if (oembedResponse.ok) oembed = await oembedResponse.json();
  } catch {
    // The watch-page parser below remains a valid fallback if oEmbed is unavailable.
  }

  let details = {};
  try {
    const response = await fetch(`${canonicalUrl}&hl=en`, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9'
      }
    });
    if (response.ok) {
      const html = (await readLimitedBytes(response, MAX_BYTES, 'YouTube source exceeded the ingestion limit.')).toString('utf8');
      const player = balancedJsonAfter(html, 'ytInitialPlayerResponse = ')
        || balancedJsonAfter(html, 'ytInitialPlayerResponse=')
        || balancedJsonAfter(html, '"ytInitialPlayerResponse":');
      details = player?.videoDetails || {};
    }
  } catch {
    // Datacenter requests to the YouTube watch page are frequently throttled.
  }

  const title = decodeEntities(String(details.title || oembed.title || '')).trim() || `YouTube video ${videoId}`;
  const author = decodeEntities(String(details.author || oembed.author_name || '')).trim();
  const rawDescription = decodeEntities(String(details.shortDescription || '')).trim().slice(0, 12_000);
  return {
    videoId,
    url: canonicalUrl,
    title,
    author,
    description: rawDescription.replace(/\s+/g, ' ').trim(),
    summary: youtubeDescriptionSummary(rawDescription, title),
    lengthSeconds: Number(details.lengthSeconds || 0) || null,
    keywords: Array.isArray(details.keywords) ? details.keywords.slice(0, 40) : [],
    thumbnailUrl: String(oembed.thumbnail_url || '')
  };
}

async function fetchYoutube(raw) {
  const metadata = await fetchYoutubeMetadata(raw);
  let transcript = '';
  let transcriptSegments = 0;
  let transcriptStatus = 'unavailable';
  let captionLanguage = '';
  try {
    const result = await Promise.race([
      fetchTranscript(metadata.url, {
        lang: 'en',
        videoDetails: true,
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36'
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Transcript extraction timed out.')), 14_000))
    ]);
    const segments = Array.isArray(result?.segments) ? result.segments : [];
    transcriptSegments = segments.length;
    transcript = decodeEntities(toPlainText(segments, ' '))
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_TEXT);
    if (transcript) {
      transcriptStatus = 'available';
      captionLanguage = 'en';
    }
  } catch {
    transcriptStatus = 'unavailable';
  }

  const fallbackText = [metadata.title, metadata.description].filter(Boolean).join('. ').slice(0, MAX_TEXT);
  return {
    ...metadata,
    text: transcript || fallbackText,
    contentType: 'video/youtube',
    transcriptStatus,
    transcriptSegments,
    captionLanguage,
    extractedCharacters: (transcript || fallbackText).length
  };
}

async function pdfToText(buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const extracted = await extractText(pdf, { mergePages: true });
  return String(extracted?.text || '')
    .replace(/\u0000/g, '')
    .replace(/\n{4,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT);
}

async function fetchPublic(raw) {
  let current = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(9_000),
      headers: { 'user-agent': '0x1-Expedition-Vault/1.0 learning-source-ingestion' }
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      current = await assertPublicUrl(new URL(response.headers.get('location'), current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const bytes = await readLimitedBytes(response, MAX_BYTES, 'Source is larger than the 8 MB ingestion limit.');
    if (contentType.includes('application/pdf') || current.pathname.toLowerCase().endsWith('.pdf')) {
      return { title: current.pathname.split('/').pop()?.replace(/\.pdf$/i, '') || 'PDF source', text: await pdfToText(bytes), contentType: 'application/pdf', url: current.toString() };
    }
    if (contentType.includes('text/html') || !contentType) {
      const extracted = extractHtml(bytes.toString('utf8'));
      return { ...extracted, contentType: 'text/html', url: current.toString() };
    }
    if (contentType.includes('text/') || contentType.includes('json') || contentType.includes('xml')) {
      return { title: current.hostname, text: bytes.toString('utf8').slice(0, MAX_TEXT), contentType, url: current.toString() };
    }
    throw new Error(`Unsupported source content type: ${contentType || 'unknown'}.`);
  }
  throw new Error('Too many URL redirects.');
}

export async function POST({ request }) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!file || typeof file.arrayBuffer !== 'function') return json({ success: false, error: 'No file supplied.' }, { status: 400 });
      if (file.size > MAX_BYTES) return json({ success: false, error: 'Files are limited to 8 MB.' }, { status: 413 });
      const bytes = Buffer.from(await file.arrayBuffer());
      const name = String(file.name || 'source');
      const lower = name.toLowerCase();
      let text = '';
      if (lower.endsWith('.pdf') || file.type === 'application/pdf') text = await pdfToText(bytes);
      else if (lower.endsWith('.txt') || lower.endsWith('.md') || String(file.type).startsWith('text/')) text = bytes.toString('utf8').slice(0, MAX_TEXT);
      else return json({ success: false, error: 'Upload a .pdf, .txt, or .md file.' }, { status: 415 });
      return json({ success: true, title: name.replace(/\.[^/.]+$/, ''), text, contentType: file.type || 'text/plain', source: 'upload' });
    }

    const body = await request.json();
    if (!body?.url) return json({ success: false, error: 'URL is required.' }, { status: 400 });
    const rawUrl = String(body.url).trim();
    const videoId = youtubeVideoId(rawUrl);
    const isYoutube = Boolean(videoId);
    const cacheKey = isYoutube ? `youtube:${videoId}` : `url:${rawUrl}`;
    const cached = cachedExtraction(cacheKey);
    if (cached) return json({ success: true, ...cached, source: isYoutube ? 'youtube' : 'url', cached: true });
    const extracted = isYoutube ? await fetchYoutube(rawUrl) : await fetchPublic(rawUrl);
    cacheExtraction(cacheKey, extracted);
    return json({ success: true, ...extracted, source: isYoutube ? 'youtube' : 'url' });
  } catch (error) {
    return json({ success: false, error: error?.message || 'Source extraction failed.' }, { status: 422 });
  }
}
