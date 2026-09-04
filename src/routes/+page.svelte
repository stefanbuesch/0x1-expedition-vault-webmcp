<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  import { cloneKnowledgePack } from '$lib/learning/knowledgepack.js';
  import { generateKnowledgePackFromMaterial, extractYoutubeVideoId } from '$lib/learning/ingestion.js';
  import { createLearningWebMCP } from '$lib/learning/webmcp.js';
  import { evaluateTextCheckpoint } from '$lib/learning/evaluation.js';
  import DungeonMap from '$lib/learning/DungeonMap.svelte';
  import EncounterRoom from '$lib/learning/EncounterRoom.svelte';
  import RunHUD from '$lib/learning/RunHUD.svelte';
  import PostRunChoiceModal from '$lib/learning/PostRunChoiceModal.svelte';
  import AgentCoPilotDock from '$lib/learning/AgentCoPilotDock.svelte';
  import PackLibrary from '$lib/learning/PackLibrary.svelte';
  import WebMCPBridge from '$lib/learning/WebMCPBridge.svelte';

  const VAULT_STORAGE_KEY = '0x1-expedition-vault:v2';

  let pack = cloneKnowledgePack();
  let rooms = pack.rooms;
  let mode = 'map';
  let activeTab = 'classroom';
  let activePackId = pack.id;
  let packLibrary = [];
  let storageReady = false;
  let currentRoomId = rooms[0]?.refId || '';
  let activeRoomId = '';
  let activePartIndex = 0;
  let cleared = [];
  let belief = 56;
  let beliefDelta = 0;
  let beliefHistory = [{ index: 0, belief, delta: 0, roomId: currentRoomId, actor: 'system' }];
  let evidence = [];
  let activity = [];
  let exposedTools = [];
  let webmcpNative = false;
  let elapsed = 0;
  let showPostRun = false;
  let adapter;
  let timer;
  let toolSyncTimer;
  let runSaveTimer;
  let persistTimer;
  let persistIdle;
  let lastPersistedVault = '';

  const toolCatalog = [
    { name: 'ingest_learning_material', mode: 'WRITE', description: 'Forge a new branching expedition from a topic, URL, transcript, article, or extracted document.' },
    { name: 'explore_module', mode: 'WRITE', description: 'Enter an available room at its current checkpoint without bypassing prerequisite gates.' },
    { name: 'submit_solution', mode: 'WRITE', description: 'Submit against the same quiz/recall checkpoint the learner sees; video checkpoints refuse agent completion.' },
    { name: 'inspect_progress', mode: 'READ', description: 'Read mastery, run depth, active checkpoint, evidence trail, source provenance, and belief trajectory.' }
  ];

  let ingestTitle = '';
  let ingestUrl = '';
  let quickForgeUrl = '';
  let quickForgeError = '';
  let ingestContent = '';
  let ingestError = '';
  let uploadedFileName = '';
  let ingestSourceMeta = null;
  let isIngesting = false;
  let isExtractingSource = false;

  seedDemoState();
  upsertCurrentPack(false);

  $: currentRoom = rooms.find((room) => room.refId === currentRoomId) || rooms[0];
  $: activeRoom = rooms.find((room) => room.refId === activeRoomId) || null;
  $: activeParts = activeRoom ? (Array.isArray(activeRoom.parts) && activeRoom.parts.length ? activeRoom.parts : [activeRoom.part].filter(Boolean)) : [];
  $: activePart = activeParts[activePartIndex] || activeParts[0] || null;
  $: activeNextRooms = activeRoom
    ? (activeRoom.edges || []).map((edge) => rooms.find((room) => room.refId === edge.targetRefId)).filter(Boolean)
    : [];
  $: activeNextRoomLabel = activeNextRooms.length > 1 ? `${activeNextRooms.length} routes unlocked` : activeNextRooms[0]?.title || '';
  $: hasStageMap = rooms.some((room) => Number.isFinite(room.map?.row));
  $: stageCount = hasStageMap ? Math.max(1, ...rooms.map((room) => Number.isFinite(room.map?.row) ? room.map.row + 1 : 1)) : Math.max(1, rooms.length);
  $: currentStage = hasStageMap && Number.isFinite(currentRoom?.map?.row) ? currentRoom.map.row : Math.max(0, rooms.indexOf(currentRoom));
  $: clearedStageRows = [...new Set(cleared.map((id) => {
    const room = rooms.find((candidate) => candidate.refId === id);
    return hasStageMap && Number.isFinite(room?.map?.row) ? room.map.row : rooms.indexOf(room);
  }).filter((row) => row >= 0))];
  $: clearedStageCount = clearedStageRows.length;
  $: overallProgress = Math.round((clearedStageCount / stageCount) * 100);
  $: progress = `${clearedStageCount} / ${stageCount}`;
  $: partProgress = activeParts.length ? `${activePartIndex + 1} / ${activeParts.length}` : '';
  $: annexRoom = rooms.find((room) => room.refId === 'commutation') || null;
  $: availableRooms = rooms.filter((room) => room.status === 'available' && !cleared.includes(room.refId));
  $: navigationRooms = availableRooms
    .filter((room) => {
      const row = hasStageMap && Number.isFinite(room.map?.row) ? room.map.row : rooms.indexOf(room);
      return row >= currentStage;
    })
    .sort((a, b) => {
      if (a.refId === currentRoomId) return -1;
      if (b.refId === currentRoomId) return 1;
      return (a.map?.row || 0) - (b.map?.row || 0);
    });
  $: libraryCards = packLibrary.map((entry) => summarizeLibraryEntry(entry));
  $: sourceGroundingTitle = pack.source?.transcriptStatus === 'available'
    ? 'Grounded in the source transcript'
    : pack.source?.provenance === 'upload'
      ? 'Grounded in extracted document text'
      : pack.source?.provenance === 'url'
        ? 'Grounded in extracted article text'
        : pack.source?.provenance === 'pasted-text'
          ? 'Grounded in your supplied notes'
          : pack.source?.provenance === 'youtube'
            ? 'Grounded in YouTube source metadata'
            : '';
  $: sourceGroundingDetail = (() => {
    const chars = Number(pack.source?.extractedCharacters || pack.source?.characterCount || 0);
    const amount = chars >= 1000 ? `${(chars / 1000).toFixed(chars >= 10000 ? 0 : 1)}k chars` : chars ? `${chars} chars` : '';
    const segments = Number(pack.source?.transcriptSegments || 0);
    if (pack.source?.transcriptStatus === 'available') return `${segments} caption segments · ${amount}${pack.source?.author ? ` · ${pack.source.author}` : ''}`;
    const kind = pack.source?.contentType || pack.source?.type || '';
    return [kind, amount].filter(Boolean).join(' · ');
  })();
  $: checkpointCount = rooms.reduce((sum, room) => sum + (Array.isArray(room.parts) && room.parts.length ? room.parts.length : room.part ? 1 : 0), 0);
  $: cognitionCheckCount = rooms.reduce((sum, room) => {
    const parts = Array.isArray(room.parts) && room.parts.length ? room.parts : [room.part].filter(Boolean);
    return sum + parts.filter((part) => part?.cognitionCheck).length;
  }, 0);
  $: cognitionGateDisplay = cognitionCheckCount || rooms.reduce((sum, room) => {
    const parts = Array.isArray(room.parts) && room.parts.length ? room.parts : [room.part].filter(Boolean);
    return sum + parts.filter((part) => ['quiz', 'recall', 'dialogue', 'case-study'].includes(part?.type)).length;
  }, 0);
  $: branchCount = rooms.reduce((sum, room) => sum + (room.edges || []).filter((edge) => ['OPTION', 'BRANCH'].includes(edge.type)).length, 0);
  $: videoRoomCount = rooms.filter((room) => {
    const parts = Array.isArray(room.parts) && room.parts.length ? room.parts : [room.part].filter(Boolean);
    return parts.some((part) => part?.type === 'video');
  }).length;
  $: packProvenanceLabel = pack.source?.provenance ? sourceLabelFor(pack.source) : 'Curated reference pack';

  function seedDemoState() {
    const n = Math.min(3, rooms.length);
    rooms.forEach((room, index) => {
      if (index <= n) room.status = 'available';
      if (index < n) room.mastery = 100;
    });
    cleared = rooms.slice(0, n).map((room) => room.refId);
    currentRoomId = rooms[Math.min(n, rooms.length - 1)]?.refId || rooms[0]?.refId || '';
    beliefHistory = [{ index: 0, belief, delta: 0, roomId: currentRoomId, actor: 'system' }];
  }

  function snapshotCurrentRun() {
    return {
      pack: structuredClone({ ...pack, rooms }),
      mode,
      currentRoomId,
      activeRoomId,
      activePartIndex,
      cleared: [...cleared],
      belief,
      beliefDelta,
      beliefHistory: structuredClone(beliefHistory),
      evidence: structuredClone(evidence),
      elapsed,
      activity: structuredClone(activity.slice(0, 12))
    };
  }

  function sourceLabelFor(source = {}) {
    if (source.transcriptStatus === 'available') return 'YouTube transcript';
    if (source.provenance === 'youtube') return 'YouTube';
    if (source.provenance === 'upload') return source.contentType?.includes('pdf') ? 'PDF document' : 'Uploaded notes';
    if (source.provenance === 'url') return 'Web source';
    if (source.provenance === 'pasted-text') return 'Pasted notes';
    if (source.provenance === 'topic') return 'Topic brief';
    return 'Bundled pack';
  }

  function roomBadge(room = {}) {
    if (room.status === 'locked') return '/assets/vault-crest.webp';
    const title = String(room.title || '').toLowerCase();
    if (room.nodeType === 'boss' || title.includes('defense') || title.includes('commutation')) return '/assets/boss.webp';
    if (title.includes('load') || title.includes('motor') || title.includes('mechanism')) return '/assets/gear.webp';
    if (title.includes('lenz') || title.includes('balance') || title.includes('evidence')) return '/assets/scales.webp';
    if (title.includes('emf') || title.includes('transfer')) return '/assets/lightning.webp';
    if (title.includes('faraday') || room.nodeType === 'quiz' || title.includes('thesis')) return '/assets/book.webp';
    if (room.nodeType === 'video' || title.includes('source')) return '/assets/crystal.webp';
    return '/assets/vault-crest.webp';
  }

  function roomBadgeSmall(room = {}) {
    return roomBadge(room).replace('.webp', '-96.webp');
  }

  function toolLabel(name = '') {
    return ({
      ingest_learning_material: 'Ingest Source',
      explore_module: 'Explore Module',
      submit_solution: 'Submit Solution',
      inspect_progress: 'Inspect Progress'
    })[name] || String(name).replaceAll('_', ' ');
  }

  function summarizeLibraryEntry(entry) {
    const snapshot = entry?.snapshot || {};
    const savedPack = snapshot.pack || {};
    const savedRooms = savedPack.rooms || [];
    const savedCleared = snapshot.cleared || [];
    const mapped = savedRooms.some((room) => Number.isFinite(room.map?.row));
    const savedStageCount = mapped ? Math.max(1, ...savedRooms.map((room) => Number.isFinite(room.map?.row) ? room.map.row + 1 : 1)) : Math.max(1, savedRooms.length);
    const clearedRows = new Set(savedCleared.map((id) => {
      const room = savedRooms.find((candidate) => candidate.refId === id);
      return mapped && Number.isFinite(room?.map?.row) ? room.map.row : savedRooms.indexOf(room);
    }).filter((row) => row >= 0));
    const selectedRoom = savedRooms.find((room) => room.refId === snapshot.currentRoomId);
    const nextAvailable = savedRooms.find((room) => room.status === 'available' && !savedCleared.includes(room.refId));
    const savedCurrent = selectedRoom && !savedCleared.includes(selectedRoom.refId) && selectedRoom.status !== 'locked'
      ? selectedRoom
      : nextAvailable || selectedRoom || savedRooms[0] || {};
    const source = savedPack.source || {};
    return {
      id: entry.id,
      title: savedPack.title || 'Untitled pack',
      goal: savedPack.goal || 'Build a causal model and prove it under pressure.',
      concepts: savedPack.concepts || [],
      sourceKind: source.provenance || (source.videoId ? 'youtube' : 'bundled'),
      sourceLabel: sourceLabelFor(source),
      progress: Math.round((clearedRows.size / savedStageCount) * 100),
      stageCleared: clearedRows.size,
      stageCount: savedStageCount,
      roomsCleared: savedCleared.length,
      roomCount: savedRooms.length,
      belief: Number(snapshot.belief || 0),
      currentRoomTitle: savedCurrent.title || 'Ready to start',
      isBossComplete: savedRooms.some((room) => room.nodeType === 'boss' && savedCleared.includes(room.refId)),
      updatedAt: entry.updatedAt || 0
    };
  }

  function persistVault(immediate = false) {
    if (!storageReady || typeof window === 'undefined') return;
    const write = () => {
      persistTimer = undefined;
      persistIdle = undefined;
      try {
        const payload = JSON.stringify({ activePackId, packs: packLibrary });
        if (payload === lastPersistedVault) return;
        localStorage.setItem(VAULT_STORAGE_KEY, payload);
        lastPersistedVault = payload;
      } catch {
        // The app remains fully usable if browser storage is unavailable.
      }
    };

    if (persistTimer) clearTimeout(persistTimer);
    if (persistIdle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(persistIdle);
    if (immediate) {
      write();
      return;
    }
    persistTimer = setTimeout(() => {
      persistTimer = undefined;
      if (typeof window.requestIdleCallback === 'function') {
        persistIdle = window.requestIdleCallback(write, { timeout: 400 });
      } else {
        write();
      }
    }, 120);
  }

  function upsertCurrentPack(persist = true) {
    if (!pack?.id) return;
    const existing = packLibrary.find((entry) => entry.id === pack.id);
    const next = {
      id: pack.id,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      snapshot: snapshotCurrentRun()
    };
    packLibrary = [next, ...packLibrary.filter((entry) => entry.id !== pack.id)].sort((a, b) => b.updatedAt - a.updatedAt);
    activePackId = pack.id;
    if (persist) persistVault();
  }

  function restorePack(id, openRun = true) {
    if (storageReady && activePackId && activePackId !== id && activeTab !== 'library') upsertCurrentPack(false);
    const entry = packLibrary.find((candidate) => candidate.id === id);
    if (!entry?.snapshot?.pack) return false;
    const snapshot = structuredClone(entry.snapshot);
    pack = snapshot.pack;
    rooms = pack.rooms || [];
    activePackId = id;
    currentRoomId = snapshot.currentRoomId || rooms[0]?.refId || '';
    activeRoomId = openRun && snapshot.mode === 'room' ? snapshot.activeRoomId || '' : '';
    activePartIndex = openRun && snapshot.mode === 'room' ? Number(snapshot.activePartIndex || 0) : 0;
    cleared = snapshot.cleared || [];
    belief = Number(snapshot.belief ?? 50);
    beliefDelta = Number(snapshot.beliefDelta || 0);
    beliefHistory = snapshot.beliefHistory || [{ index: 0, belief, delta: 0, roomId: currentRoomId, actor: 'system' }];
    evidence = snapshot.evidence || [];
    elapsed = Number(snapshot.elapsed || 0);
    activity = snapshot.activity || [];
    showPostRun = false;
    if (openRun) {
      activeTab = 'classroom';
      mode = activeRoomId ? 'room' : 'map';
    } else {
      activeRoomId = '';
      activePartIndex = 0;
      mode = 'map';
    }
    persistVault();
    scheduleToolSync(false);
    return true;
  }

  function goLibrary() {
    upsertCurrentPack();
    activeTab = 'library';
    mode = 'map';
    activeRoomId = '';
    activePartIndex = 0;
  }

  function resetRun(nextPack, actor = 'system') {
    pack = nextPack;
    rooms = pack.rooms;
    activePackId = pack.id;
    mode = 'map';
    activeTab = 'classroom';
    activeRoomId = '';
    activePartIndex = 0;
    currentRoomId = rooms[0]?.refId || '';
    cleared = [];
    belief = 50;
    beliefDelta = 0;
    beliefHistory = [{ index: 0, belief, delta: 0, roomId: currentRoomId, actor }];
    evidence = [];
    elapsed = 0;
    showPostRun = false;
    scheduleToolSync();
  }

  function log(tool, args, result, kind = 'state') {
    activity = [{ tool, args: typeof args === 'string' ? args : JSON.stringify(args), result, kind }, ...activity].slice(0, 12);
  }

  function scheduleRunSave() {
    if (typeof window === 'undefined') return;
    if (runSaveTimer) clearTimeout(runSaveTimer);
    runSaveTimer = setTimeout(() => {
      runSaveTimer = undefined;
      upsertCurrentPack();
    }, 120);
  }

  function scheduleToolSync(saveRun = true) {
    if (typeof window === 'undefined') return;
    if (!toolSyncTimer) {
      toolSyncTimer = setTimeout(() => {
        toolSyncTimer = undefined;
        syncTools();
      }, 0);
    }
    if (saveRun) scheduleRunSave();
  }

  function applyBelief(delta, actor = 'human', roomId = activeRoomId || currentRoomId) {
    beliefDelta = delta;
    belief = Math.max(5, Math.min(98, belief + delta));
    const index = (beliefHistory.at(-1)?.index ?? -1) + 1;
    beliefHistory = [...beliefHistory, { index, belief, delta, roomId, actor }].slice(-64);
    scheduleToolSync();
  }

  function unlockFrom(room) {
    for (const edge of room.edges || []) {
      const target = rooms.find((candidate) => candidate.refId === edge.targetRefId);
      if (!target || cleared.includes(target.refId)) continue;
      if (edge.type === 'GATE' && belief < (pack.threshold || 50)) {
        log('gate_check', target.refId, `Gate held · mastery ${belief}% < ${pack.threshold || 50}%`, 'approval');
        continue;
      }
      target.status = 'available';
    }
    rooms = [...rooms];
  }

  function openRoom(id, actor = 'human') {
    const room = rooms.find((candidate) => candidate.refId === id);
    if (!room || room.status === 'locked') return false;
    currentRoomId = id;
    activeRoomId = id;
    activePartIndex = 0;
    mode = 'room';
    log(actor === 'agent' ? 'agent_open_module' : 'human_open_module', id, `Entered ${room.title}`, 'state');
    scheduleToolSync();
    return true;
  }

  function leaveRoom() {
    activeRoomId = '';
    activePartIndex = 0;
    mode = 'map';
    scheduleToolSync();
  }

  function completeRoom(room, result = {}, actor = 'human') {
    if (!room || cleared.includes(room.refId)) {
      leaveRoom();
      return;
    }
    cleared = [...cleared, room.refId];
    room.status = 'cleared';
    room.mastery = Math.min(100, Math.max(room.mastery || 0, 100));
    evidence = [...evidence, {
      roomId: room.refId,
      actor,
      detail: result.detail || 'Room cleared',
      belief,
      at: Date.now()
    }].slice(-20);
    unlockFrom(room);

    const next = (room.edges || [])
      .map((edge) => rooms.find((candidate) => candidate.refId === edge.targetRefId))
      .filter((candidate) => candidate?.status === 'available' && !cleared.includes(candidate.refId))
      .sort((a, b) => (a.mastery || 0) - (b.mastery || 0))[0];
    if (next) currentRoomId = next.refId;

    activeRoomId = '';
    activePartIndex = 0;
    mode = 'map';
    log(actor === 'agent' ? 'agent_module_clear' : 'human_module_clear', room.refId, `${room.title} cleared; expedition topology updated`, 'state');
    if (room.nodeType === 'boss') showPostRun = true;
    scheduleToolSync();
  }

  function evaluate(room, solution, partOverride = null) {
    const targetPart = partOverride || room?.part || {};
    const text = String(solution || '').trim().toLowerCase();
    if (!text) return { success: false, score: 0, detail: 'Empty solution refused.' };
    if (targetPart.type === 'video') return { success: false, score: 0, detail: 'Source rooms require human viewing.' };
    if (targetPart.type === 'quiz') {
      const correct = String(targetPart.options?.[targetPart.correctIndex] || '').toLowerCase();
      const letter = String.fromCharCode(65 + Number(targetPart.correctIndex || 0)).toLowerCase();
      const ok = text === letter || text === String(targetPart.correctIndex) || text.includes(correct.slice(0, Math.min(26, correct.length)));
      return { success: ok, score: ok ? 1 : 0, detail: ok ? targetPart.explanation : 'The answer failed this checkpoint.' };
    }
    return evaluateTextCheckpoint({
      text: solution,
      expected: targetPart.expected || targetPart.checklist || [],
      prompt: targetPart.question || targetPart.prompt || targetPart.title || '',
      type: targetPart.type,
      roomId: room.refId,
      isBoss: room.nodeType === 'boss',
      sourceHidden: Boolean(targetPart.cognitionCheck?.sourceHidden)
    });
  }

  function partReward(room, part) {
    const configured = Number(part?.beliefDelta);
    if (Number.isFinite(configured)) return configured;
    const parts = Array.isArray(room?.parts) && room.parts.length ? room.parts : [room?.part].filter(Boolean);
    return Math.max(3, Math.round((room?.beliefDelta || 7) / Math.max(1, parts.length)));
  }

  async function resolveMaterial({ title = '', url = '', content = '', sourceMeta = null } = {}) {
    let resolvedTitle = String(title || '').trim();
    let resolvedContent = String(content || '').trim();
    const resolvedUrl = String(url || '').trim();
    let resolvedMeta = sourceMeta ? { ...sourceMeta } : null;

    if (resolvedUrl && !resolvedContent) {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: resolvedUrl })
      });
      const extracted = await response.json();
      if (!response.ok || !extracted?.success) throw new Error(extracted?.error || 'Could not extract the source URL.');
      resolvedContent = String(extracted.text || '').trim();
      if (!resolvedTitle) resolvedTitle = String(extracted.title || '').trim();
      resolvedMeta = {
        source: extracted.source || (extractYoutubeVideoId(resolvedUrl) ? 'youtube' : 'url'),
        contentType: extracted.contentType || '',
        transcriptStatus: extracted.transcriptStatus || '',
        transcriptSegments: Number(extracted.transcriptSegments || 0),
        captionLanguage: extracted.captionLanguage || '',
        author: extracted.author || '',
        lengthSeconds: Number(extracted.lengthSeconds || 0) || null,
        summary: String(extracted.summary || '').trim(),
        extractedCharacters: Number(extracted.extractedCharacters || resolvedContent.length || 0),
        sourceTitle: String(extracted.title || '').trim()
      };
      if (!resolvedContent) throw new Error('The source URL returned no usable learning text.');
    }

    if (!resolvedMeta) {
      resolvedMeta = {
        source: resolvedUrl ? (extractYoutubeVideoId(resolvedUrl) ? 'youtube' : 'url') : resolvedContent ? 'pasted-text' : 'topic',
        extractedCharacters: resolvedContent.length
      };
    }
    return { title: resolvedTitle, url: resolvedUrl, content: resolvedContent, sourceMeta: resolvedMeta };
  }

  async function handleIngestMaterial() {
    ingestError = '';
    if (!ingestTitle.trim() && !ingestContent.trim() && !ingestUrl.trim()) {
      ingestError = 'Enter a topic, YouTube/source link, text, or upload a document.';
      return;
    }
    isIngesting = true;
    try {
      const material = await resolveMaterial({ title: ingestTitle, content: ingestContent, url: ingestUrl, sourceMeta: ingestSourceMeta });
      const nextPack = generateKnowledgePackFromMaterial(material);
      resetRun(nextPack, 'system');
      log('ingest_learning_material', material.title || material.url || uploadedFileName || 'raw material', `Generated ${rooms.length} branching rooms from the source`, 'state');
    } catch (error) {
      ingestError = error?.message || 'Could not generate the expedition.';
    } finally {
      isIngesting = false;
    }
  }

  async function handleQuickForge() {
    const url = quickForgeUrl.trim();
    quickForgeError = '';
    if (!url) {
      activeTab = 'ingest';
      return;
    }
    ingestTitle = '';
    ingestContent = '';
    ingestSourceMeta = null;
    uploadedFileName = '';
    ingestUrl = url;
    await handleIngestMaterial();
    if (ingestError) quickForgeError = ingestError;
    else quickForgeUrl = '';
  }

  async function handleFileUpload(event) {
    ingestError = '';
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      ingestError = 'Files are limited to 8 MB.';
      event.target.value = '';
      return;
    }
    uploadedFileName = file.name;
    isExtractingSource = true;
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/extract', { method: 'POST', body: form });
      const extracted = await response.json();
      if (!response.ok || !extracted?.success) throw new Error(extracted?.error || 'Could not extract this document.');
      ingestContent = String(extracted.text || '').trim();
      if (!ingestTitle.trim()) ingestTitle = String(extracted.title || file.name.replace(/\.[^/.]+$/, '')).trim();
      ingestSourceMeta = {
        source: extracted.source || 'upload',
        contentType: extracted.contentType || file.type || '',
        extractedCharacters: ingestContent.length,
        sourceTitle: String(extracted.title || ingestTitle || uploadedFileName).trim(),
        fileName: uploadedFileName
      };
      if (!ingestContent) throw new Error('The uploaded document contained no extractable text.');
    } catch (error) {
      ingestError = error?.message || 'The selected document could not be read.';
      uploadedFileName = '';
      ingestSourceMeta = null;
      event.target.value = '';
    } finally {
      isExtractingSource = false;
    }
  }

  const actions = {
    async ingest({ title = '', url = '', content = '' }) {
      const material = await resolveMaterial({ title, url, content });
      const nextPack = generateKnowledgePackFromMaterial(material);
      resetRun(nextPack, 'agent');
      return { success: true, courseId: pack.id, title: pack.title, modules: rooms.length, concepts: pack.concepts || [], template: pack.template, summary: `Created and launched “${pack.title}” as a ${rooms.length}-room branching expedition.` };
    },
    exploreModule(id) {
      const room = rooms.find((candidate) => candidate.refId === id);
      if (!room) throw new Error(`Unknown module ${id}`);
      if (room.status === 'locked') throw new Error(`Module ${id} is locked. Complete its prerequisite first.`);
      openRoom(id, 'agent');
      const parts = Array.isArray(room.parts) && room.parts.length ? room.parts : [room.part].filter(Boolean);
      const part = parts[0] || {};
      return {
        id: room.refId,
        title: room.title,
        mastery: room.mastery,
        status: room.status,
        partIndex: 0,
        partCount: parts.length,
        type: part.type,
        prompt: part.question || part.prompt || part.title || '',
        summary: `Entered ${room.title} at checkpoint 1 of ${parts.length}.`
      };
    },
    inspectProgress() {
      return {
        courseId: pack.id,
        title: pack.title,
        masteryScore: belief,
        threshold: pack.threshold || 50,
        progress: overallProgress,
        cleared: [...cleared],
        currentModule: currentRoomId,
        activeModule: activeRoomId,
        activePartIndex,
        activePartCount: activeParts.length,
        activePartType: activePart?.type || null,
        concepts: pack.concepts || [],
        source: pack.source || {},
        trajectory: beliefHistory.slice(-10),
        evidence: evidence.slice(-8)
      };
    },
    submitSolution(moduleId, solution) {
      const room = rooms.find((candidate) => candidate.refId === moduleId);
      if (!room || room.status === 'locked') return { success: false, summary: 'Encounter refused: module is locked.' };
      if (activeRoomId !== moduleId) openRoom(moduleId, 'agent');
      const parts = Array.isArray(room.parts) && room.parts.length ? room.parts : [room.part].filter(Boolean);
      const partIndex = activeRoomId === moduleId ? activePartIndex : 0;
      const targetPart = parts[partIndex] || parts[0] || {};
      if (targetPart.type === 'video') return { success: false, moduleId, partIndex, summary: 'This checkpoint requires human source viewing before an agent can continue the room.' };
      const outcome = evaluate(room, solution, targetPart);
      const reward = partReward(room, targetPart);
      const delta = outcome.success ? reward : -Math.max(4, Math.round(reward * .8));
      applyBelief(delta, 'agent', moduleId);
      currentRoomId = moduleId;
      if (outcome.success) {
        if (partIndex < parts.length - 1) {
          activeRoomId = moduleId;
          activePartIndex = partIndex + 1;
          mode = 'room';
          log('agent_checkpoint_clear', { moduleId, partIndex }, `${room.title} checkpoint ${partIndex + 1}/${parts.length} cleared`, 'state');
          scheduleToolSync();
          return { success: true, score: outcome.score, delta, belief, moduleId, partIndex, nextPartIndex: activePartIndex, roomComplete: false, summary: `${room.title}: ${outcome.detail} Continue at checkpoint ${activePartIndex + 1}/${parts.length}.` };
        }
        completeRoom(room, { delta, detail: outcome.detail }, 'agent');
        return { success: true, score: outcome.score, delta, belief, moduleId, partIndex, roomComplete: true, summary: `${room.title}: ${outcome.detail} Room cleared.` };
      }
      log('agent_solution_refused', { moduleId, partIndex }, outcome.detail, 'approval');
      return { success: false, score: outcome.score, delta, belief, moduleId, partIndex, roomComplete: false, summary: `${room.title}: ${outcome.detail}` };
    }
  };

  function getState() {
    return {
      packId: pack.id,
      seed: pack.seed,
      selectedLesson: currentRoomId,
      activeRoomId,
      cleared: [...cleared],
      masteryScore: belief,
      threshold: pack.threshold || 50,
      progress: overallProgress,
      source: pack.source || {},
      modules: rooms.map((room) => {
        const parts = Array.isArray(room.parts) && room.parts.length ? room.parts : [room.part].filter(Boolean);
        const partIndex = room.refId === activeRoomId ? activePartIndex : 0;
        const part = parts[partIndex] || parts[0] || {};
        return {
          id: room.refId,
          title: room.title,
          status: room.status,
          completed: cleared.includes(room.refId),
          type: part.type,
          partIndex,
          partCount: parts.length,
          prompt: part.question || part.prompt || part.title || '',
          mastery: room.mastery || 0
        };
      })
    };
  }

  async function syncTools() {
    if (!adapter) return;
    try {
      const registration = await adapter.sync();
      webmcpNative = registration.supported;
      exposedTools = registration.tools;
    } catch {
      webmcpNative = false;
      exposedTools = [];
    }
  }

  function restart() {
    const fresh = structuredClone(pack);
    fresh.rooms = (fresh.rooms || []).map((room, index) => ({
      ...room,
      status: index === 0 ? 'available' : 'locked',
      mastery: 0
    }));
    resetRun(fresh, 'system');
  }

  onMount(() => {
    try {
      const storedRaw = localStorage.getItem(VAULT_STORAGE_KEY) || '';
      lastPersistedVault = storedRaw;
      const stored = JSON.parse(storedRaw || 'null');
      if (Array.isArray(stored?.packs) && stored.packs.length) {
        packLibrary = stored.packs;
        const preferred = stored.activePackId && stored.packs.some((entry) => entry.id === stored.activePackId)
          ? stored.activePackId
          : stored.packs[0].id;
        activePackId = preferred;
        storageReady = true;
        restorePack(preferred, false);
      } else {
        storageReady = true;
        upsertCurrentPack();
      }
    } catch {
      storageReady = true;
      upsertCurrentPack();
    }

    adapter = createLearningWebMCP({ getState, actions, onActivity: log });
    syncTools();
    const requestedRoom = new URLSearchParams(window.location.search).get('room');
    if (requestedRoom) {
      activeTab = 'classroom';
      openRoom(requestedRoom);
    } else {
      activeTab = 'classroom';
      mode = 'map';
    }

    const flushCurrentRun = () => {
      if (activeTab === 'library') persistVault(true);
      else {
        upsertCurrentPack(false);
        persistVault(true);
      }
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') flushCurrentRun();
    };
    window.addEventListener('beforeunload', flushCurrentRun);
    document.addEventListener('visibilitychange', flushWhenHidden);
    timer = setInterval(() => {
      if (activeTab !== 'classroom' || document.visibilityState !== 'visible') return;
      elapsed += 1;
      if (elapsed % 30 === 0) upsertCurrentPack();
    }, 1000);
    return () => {
      if (toolSyncTimer) clearTimeout(toolSyncTimer);
      if (runSaveTimer) clearTimeout(runSaveTimer);
      if (persistTimer) clearTimeout(persistTimer);
      if (persistIdle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(persistIdle);
      flushCurrentRun();
      window.removeEventListener('beforeunload', flushCurrentRun);
      document.removeEventListener('visibilitychange', flushWhenHidden);
      clearInterval(timer);
      adapter?.destroy();
    };
  });
</script>

<svelte:head>
  <title>0x1 Expedition Vault // {pack.title}</title>
  <meta name="description" content="An agent-native learning roguelike powered by WebMCP." />
  <meta name="theme-color" content="#f7f8fb" />
  <link rel="icon" type="image/webp" href="/assets/vault-crest-96.webp" />
  <link rel="preload" as="image" href="/assets/expedition-map-1400.webp" imagesrcset="/assets/expedition-map-1400.webp 1x, /assets/expedition-map.webp 2x" fetchpriority="high" />
  <link rel="stylesheet" href="/vault.css" />
</svelte:head>

{#if mode === 'room' && activeRoom}
  <div class="runtime-shell">
    <RunHUD
      packTitle={pack.title}
      roomTitle={activeRoom.title}
      {progress}
      {belief}
      threshold={pack.threshold || 50}
      {beliefDelta}
      {elapsed}
      clearedCount={clearedStageCount}
      totalRooms={stageCount}
      {partProgress}
      onVault={goLibrary}
      onMap={leaveRoom}
    />
    <EncounterRoom
      room={activeRoom}
      {belief}
      clearedCount={clearedStageCount}
      totalRooms={stageCount}
      alreadyCleared={cleared.includes(activeRoom.refId)}
      nextRoomTitle={activeNextRoomLabel}
      currentPartIndex={activePartIndex}
      onPartChange={(index) => { activePartIndex = index; scheduleToolSync(); }}
      onBeliefChange={(delta) => applyBelief(delta, 'human', activeRoom.refId)}
      onComplete={(result) => completeRoom(activeRoom, result, 'human')}
    />
    <AgentCoPilotDock native={webmcpNative} tools={exposedTools} {activity} />
  </div>
{:else}
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <button class="brand" on:click={goLibrary}>
          <span class="brand-mark"><img src="/assets/vault-crest-96.webp" srcset="/assets/vault-crest-96.webp 1x, /assets/vault-crest.webp 2x" alt="" /></span>
          <span><b>0x1 Expedition Vault</b><small>Learning Roguelike</small></span>
        </button>
        <nav class="primary-nav">
          <button class:active={activeTab === 'classroom'} on:click={() => { upsertCurrentPack(); activeTab = 'classroom'; mode = 'map'; }}>Expeditions</button>
          <button class:active={activeTab === 'library' || activeTab === 'pack'} on:click={goLibrary}>Knowledge Packs</button>
          <button class:active={activeTab === 'ingest'} on:click={() => { upsertCurrentPack(); activeTab = 'ingest'; }}>Forge from URL</button>
          <button class:active={activeTab === 'agent'} on:click={() => { upsertCurrentPack(); activeTab = 'agent'; }}>WebMCP</button>
        </nav>
        <button class:webmcp-live={webmcpNative} class="party-state webmcp-state" on:click={() => { upsertCurrentPack(); activeTab = 'agent'; }}><span></span><b>WebMCP</b>{webmcpNative ? `${exposedTools.length || 4} tools live` : '4 tools ready'}</button>
      </div>
    </header>

    {#if activeTab === 'library'}
      <PackLibrary
        packs={libraryCards}
        {activePackId}
        {webmcpNative}
        webmcpTools={exposedTools}
        onOpen={(id) => restorePack(id, true)}
        onForge={() => { upsertCurrentPack(); activeTab = 'ingest'; }}
        onAgent={() => { upsertCurrentPack(); activeTab = 'agent'; }}
      />
    {:else if activeTab === 'ingest'}
      <main class="forge-page">
        <div class="product-heading forge-heading">
          <div>
            <span>FORGE / SOURCE INGESTION</span>
            <h1>Turn source material into a playable expedition.</h1>
            <p>Ingest once. The same generated graph becomes the learner experience and the WebMCP agent state.</p>
          </div>
          <button class="secondary-action" on:click={goLibrary}>← Back to vault</button>
        </div>

        <section class="forge-hero">
          <div class="forge-copy">
            <span>SUPPORTED SOURCES</span>
            <h2>Bring the material. The Forge builds the run.</h2>
            <p>Use a topic, YouTube lecture, public article or PDF URL, pasted notes, Markdown, or a local document.</p>
            <div class="forge-source-grid">
              <div><i>▶</i><span><b>YouTube</b><small>Video + public transcript</small></span></div>
              <div><i>↗</i><span><b>Web</b><small>Article or public PDF URL</small></span></div>
              <div><i>▤</i><span><b>Files</b><small>PDF · TXT · Markdown</small></span></div>
              <div><i>¶</i><span><b>Notes</b><small>Raw text or a topic brief</small></span></div>
            </div>

            <div class="forge-output">
              <div class="forge-output-head"><span>WHAT THE FORGE CREATES</span><b>one shared run</b></div>
              <div class="forge-output-grid">
                <div><strong>6</strong><small>progression stages</small></div>
                <div><strong>8</strong><small>branching rooms</small></div>
                <div><strong>2</strong><small>route decisions</small></div>
                <div><strong>✓</strong><small>cognition gates</small></div>
              </div>
            </div>

            <div class="forge-context">
              <div><span>WEBMCP</span><b>{webmcpNative ? `${exposedTools.length || 4} native tools live` : '4 native tools ready'}</b></div>
              <div><span>VAULT</span><b>{libraryCards.length} saved {libraryCards.length === 1 ? 'pack' : 'packs'}</b></div>
              <div class="wide"><span>CURRENT RUN</span><b>{pack.title}</b></div>
            </div>
          </div>

          <div class="forge-form">
            <header class="forge-form-head">
              <div><span>NEW KNOWLEDGE PACK</span><h2>Source input</h2></div>
              <b class:ready={Boolean(ingestTitle.trim() || ingestContent.trim() || ingestUrl.trim() || uploadedFileName)}>{isExtractingSource ? 'Extracting…' : uploadedFileName ? 'Document ready' : 'Awaiting source'}</b>
            </header>
            <label>Topic or course title<input bind:value={ingestTitle} placeholder="e.g. Plate tectonics" /></label>
            <label>Source URL<input bind:value={ingestUrl} placeholder="https://youtube.com/watch?v=…" /></label>
            <label class="wide">Notes / transcript<textarea bind:value={ingestContent} rows="7" placeholder="Paste text, transcript, lecture notes, or article excerpts…"></textarea></label>
            <label class="file-drop wide"><span>{isExtractingSource ? 'Extracting document…' : uploadedFileName ? `Ready · ${uploadedFileName}` : 'Drop in a PDF, TXT, or Markdown file'}</span><input type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" on:change={handleFileUpload} /></label>
            {#if ingestError}<div class="form-error wide">{ingestError}</div>{/if}
            <div class="forge-submit-row wide">
              <div><span>EXTRACT</span><i></i><span>MODEL</span><i></i><span>BRANCH</span><i></i><span>PROVE</span></div>
              <button class="forge-submit" disabled={isIngesting || isExtractingSource} on:click={handleIngestMaterial}>{isIngesting ? 'Forging expedition…' : 'Forge Knowledge Pack →'}</button>
            </div>
          </div>
        </section>
      </main>
    {:else if activeTab === 'classroom'}
      <main class="vault-page">
        <div class="page-heading">
          <div>
            <div class="breadcrumbs"><button on:click={goLibrary}>Vault</button><span>›</span> Current Run <span>›</span> {pack.title}</div>
            <h1>{pack.title}</h1>
            <p>{pack.goal || 'Master the source through causal exploration, recall, and transfer.'}</p>
          </div>
          <div class="heading-actions">
            <button class="secondary-action" on:click={goLibrary}>All packs</button>
            <button class="secondary-action strong" on:click={() => { upsertCurrentPack(); activeTab = 'ingest'; }}>Forge new</button>
          </div>
        </div>

        <div class="vault-grid">
          <section class="hero-column">
            <DungeonMap rooms={rooms} currentRefId={currentRoomId} clearedRefIds={cleared} onRoomClick={openRoom} />
            <section class="forge-bar quick-forge" class:grounded={Boolean(sourceGroundingTitle)}>
              <div class="forge-icon">↗</div>
              <div class="forge-copyline">
                <b>Generate Knowledge Pack from any URL</b>
                <span class:error={Boolean(quickForgeError)} aria-live="polite">{quickForgeError || (sourceGroundingTitle ? `Current run grounded in ${sourceGroundingTitle}. Forge another source instantly.` : 'YouTube, article, public PDF, or any supported URL.')}</span>
              </div>
              <input bind:value={quickForgeUrl} aria-label="Source URL for quick Forge" placeholder="Paste YouTube, PDF, article, or source URL…" on:keydown={(event) => event.key === 'Enter' && handleQuickForge()} />
              <button disabled={isIngesting} aria-busy={isIngesting} on:click={handleQuickForge}>{isIngesting ? 'Forging…' : quickForgeUrl.trim() ? 'Forge Pack' : 'Open Forge'}</button>
            </section>
          </section>

          <aside class="right-rail">
            <section class="rail-card mastery-card">
              <div class="rail-heading"><b>Mastery Progress</b><span>{overallProgress}% run</span></div>
              <div class="mastery-body">
                <div class="mastery-ring" style={`--p:${belief * 3.6}deg`}><span>{belief}%<small>Belief</small></span></div>
                <div class="metric-list">
                  <div><span>Rooms mastered</span><b>{cleared.length} / {rooms.length}</b></div>
                  <div><span>Run depth</span><b>{clearedStageCount} / {stageCount}</b></div>
                  <div><span>Boss threshold</span><b>{pack.threshold || 50}%</b></div>
                </div>
              </div>
            </section>

            <section class="rail-card depth-card">
              <div class="rail-heading"><b>Expedition Depth</b><span>Current run</span></div>
              <strong>Floor {Math.min(stageCount, currentStage + 1)} of {stageCount} · {currentRoom.title}</strong>
              <div class="depth-track">{#each Array(stageCount) as _, stage}<span class:done={clearedStageRows.includes(stage)} class:current={stage === currentStage}></span>{/each}</div>
            </section>

            <section class="rail-card concept-mastery-card">
              <div class="rail-heading"><b>Concept Mastery</b><button on:click={() => activeTab = 'pack'}>View map</button></div>
              <div class="concept-badges">
                {#each rooms.slice(0, 6) as room, index}
                  {@const done = cleared.includes(room.refId)}
                  {@const current = room.refId === currentRoomId}
                  <button class:done class:current class:locked={room.status === 'locked'} disabled={room.status === 'locked'} on:click={() => openRoom(room.refId)} aria-label={`${index + 1}. ${room.title}, ${done ? 'mastered' : current ? 'current' : room.status}`}>
                    <span><img src={roomBadgeSmall(room)} srcset={`${roomBadgeSmall(room)} 1x, ${roomBadge(room)} 2x`} alt="" loading="lazy" decoding="async" /></span>
                    <small>{index + 1}</small>
                  </button>
                {/each}
              </div>
            </section>

            <section class="rail-card curriculum-card">
              <div class="rail-heading"><b>Curriculum Structure</b><span>{rooms.length} rooms</span></div>
              <div class="curriculum-list">
                {#each rooms as room, index}
                  {@const done = cleared.includes(room.refId)}
                  {@const roomStage = hasStageMap && Number.isFinite(room.map?.row) ? room.map.row : index}
                  {@const optional = !done && room.status === 'available' && clearedStageRows.includes(roomStage)}
                  <button class:active={room.refId === currentRoomId} class:done class:locked={room.status === 'locked'} class:optional disabled={room.status === 'locked'} on:click={() => openRoom(room.refId)}>
                    <span class="step-index">{done ? '✓' : optional ? '◇' : index + 1}</span>
                    <span class="step-copy"><b>{room.title}</b><small>{optional ? 'Optional lane' : room.nodeType === 'video' ? 'Source study' : room.nodeType === 'quiz' ? 'Knowledge check' : room.nodeType === 'boss' ? 'Boss encounter' : 'Causal challenge'}</small></span>
                    <span class="step-action">{room.status === 'locked' ? '·' : '›'}</span>
                  </button>
                {/each}
              </div>
            </section>

            <section class="rail-card agent-card webmcp-card">
              <div class="rail-heading"><b>Guide Agent <em>//</em></b><span class="live-dot">{webmcpNative ? 'Active · WebMCP' : 'WebMCP ready'}</span></div>
              <p>Your browser-native co-pilot shares the same expedition state, gates, mastery, and checkpoints shown on this map.</p>
              <div class="tool-chips">{#each (exposedTools.length ? exposedTools : ['ingest_learning_material', 'explore_module', 'submit_solution', 'inspect_progress']) as tool}<code title={tool}>{toolLabel(tool)}</code>{/each}</div>
              <button class="agent-console-cta" on:click={() => activeTab = 'agent'}>Open WebMCP Console →</button>
            </section>
          </aside>
        </div>
      </main>
    {:else if activeTab === 'pack'}
      <main class="product-page pack-page">
        <div class="product-heading">
          <div><span>KNOWLEDGE PACK / LIVE ARTIFACT</span><h1>{pack.title}</h1><p>Source grounding, extracted concepts, cognition checks, and the exact room graph driving this run.</p></div>
          <button class="secondary-action strong" on:click={() => activeTab = 'classroom'}>Open expedition →</button>
        </div>

        <section class="pack-hero surface-card">
          <div class="pack-hero-art">
            <div class="pack-map-art"></div>
            <div class="pack-art-shade"></div>
            <span class="pack-source-badge">{packProvenanceLabel}</span>
            <img src="/assets/vault-crest.webp" alt="" />
          </div>
          <div class="pack-hero-copy">
            <span>ACTIVE KNOWLEDGE PACK</span>
            <h2>{pack.title}</h2>
            <p>{pack.goal}</p>
            <div class="pack-hero-stats">
              <div><strong>{overallProgress}%</strong><small>RUN COMPLETE</small></div>
              <div><strong>{stageCount}</strong><small>STAGES</small></div>
              <div><strong>{checkpointCount}</strong><small>CHECKPOINTS</small></div>
              <div><strong>{cognitionGateDisplay}</strong><small>COGNITION GATES</small></div>
            </div>
          </div>
          <aside class="pack-next-card">
            <span>NEXT ENCOUNTER</span>
            <img src={roomBadgeSmall(navigationRooms[0] || currentRoom)} srcset={`${roomBadgeSmall(navigationRooms[0] || currentRoom)} 1x, ${roomBadge(navigationRooms[0] || currentRoom)} 2x`} alt="" />
            <h3>{navigationRooms[0]?.title || currentRoom.title}</h3>
            <p>{overallProgress >= 100 ? 'Main path cleared. Review any optional lane.' : `${belief}% belief · stage ${Math.min(stageCount, currentStage + 1)} of ${stageCount}`}</p>
            <button on:click={() => activeTab = 'classroom'}>{overallProgress >= 100 ? 'Review map →' : 'Continue run →'}</button>
          </aside>
        </section>

        <div class="inspect-grid pack-inspect-grid">
          <section class="surface-card source-card">
            <div class="surface-heading"><div><span>SOURCE GROUNDING</span><h2>{sourceGroundingTitle || packProvenanceLabel}</h2></div><b>{pack.seed}</b></div>
            <p>{sourceGroundingDetail || (pack.source?.provenance ? 'Source extraction is attached to this run.' : 'Curated source material and verified media are bundled with this reference pack.')}</p>
            {#if pack.source?.url}<div class="source-url">{pack.source.url}</div>{/if}
            <div class="source-metrics">
              <div><small>PROVENANCE</small><strong>{packProvenanceLabel}</strong></div>
              <div><small>SOURCE DEPTH</small><strong>{pack.source?.extractedCharacters || pack.source?.characterCount ? `${pack.source?.extractedCharacters || pack.source?.characterCount} chars` : `${videoRoomCount} verified media`}</strong></div>
              <div><small>BRANCHES</small><strong>{branchCount || 'linear reference'}</strong></div>
              <div><small>RUN SHAPE</small><strong>{stageCount} stages · {rooms.length} rooms</strong></div>
            </div>
          </section>

          <section class="surface-card concept-card">
            <div class="surface-heading"><div><span>CONCEPT MODEL</span><h2>What the expedition is training</h2></div><b>{(pack.concepts || []).length || rooms.length}</b></div>
            <div class="concept-cloud">
              {#each ((pack.concepts || []).length ? pack.concepts : rooms.map((room) => room.title)) as concept}
                <span>{concept}</span>
              {/each}
            </div>
            <div class="goal-box"><small>MISSION THESIS</small><p>{pack.goal}</p></div>
          </section>
        </div>

        <section class="surface-card topology-card topology-card-grid">
          <div class="surface-heading"><div><span>CURRICULUM GRAPH</span><h2>Rooms, checkpoints, and route topology</h2></div><b>{pack.template || 'expedition'}</b></div>
          <div class="topology-grid">
            {#each rooms as room, index}
              {@const parts = Array.isArray(room.parts) && room.parts.length ? room.parts : [room.part].filter(Boolean)}
              <article class:cleared={cleared.includes(room.refId)} class:current={room.refId === currentRoomId} class:locked={room.status === 'locked'} class="topology-room-card">
                <header>
                  <div class="topology-room-icon"><img src={roomBadgeSmall(room)} srcset={`${roomBadgeSmall(room)} 1x, ${roomBadge(room)} 2x`} alt="" loading="lazy" decoding="async" /></div>
                  <div><span>STAGE {Number.isFinite(room.map?.row) ? room.map.row + 1 : index + 1}</span><b>{cleared.includes(room.refId) ? 'MASTERED' : room.status.toUpperCase()}</b></div>
                </header>
                <h3>{room.title}</h3>
                <p>{room.subtitle || `${parts.length} checkpoint${parts.length === 1 ? '' : 's'} in this room.`}</p>
                <div class="part-tags">{#each parts as part}<code>{part.type}</code>{#if part.cognitionCheck}<code class="cognition-tag">{part.cognitionCheck.kind}</code>{/if}{/each}</div>
                <footer>
                  <span>{parts.length} checkpoint{parts.length === 1 ? '' : 's'}</span>
                  <div class="edge-tags">{#each room.edges || [] as edge}<span>{edge.type} → {rooms.find((candidate) => candidate.refId === edge.targetRefId)?.title || edge.targetRefId}</span>{/each}</div>
                </footer>
              </article>
            {/each}
          </div>
        </section>
      </main>
    {:else if activeTab === 'agent'}
      <main class="product-page agent-console-page">
        <div class="product-heading webmcp-heading">
          <div><span>WEBMCP / DOCUMENT.MODELCONTEXT</span><h1>Human and browser agent, one live expedition.</h1><p>The browser exposes explicit learning actions instead of forcing an agent to infer state from buttons or scrape the DOM.</p></div>
          <div class:webmcp-on={webmcpNative} class="console-status"><i></i>{webmcpNative ? `${exposedTools.length || 4} native tools live` : 'WebMCP surface ready'}</div>
        </div>

        <section class="webmcp-hero-grid">
          <article class="surface-card webmcp-state-hero">
            <div class="webmcp-state-art"><div></div><img src={roomBadgeSmall(currentRoom)} srcset={`${roomBadgeSmall(currentRoom)} 1x, ${roomBadge(currentRoom)} 2x`} alt="" /></div>
            <div class="webmcp-state-copy">
              <span>ONE SHARED RUN STATE</span>
              <h2>{pack.title}</h2>
              <p>Human actions and WebMCP calls mutate the same room graph, checkpoint, mastery trajectory, and source provenance.</p>
              <div class="webmcp-state-metrics">
                <div><strong>{belief}%</strong><small>BELIEF</small></div>
                <div><strong>{overallProgress}%</strong><small>RUN</small></div>
                <div><strong>{clearedStageCount}/{stageCount}</strong><small>DEPTH</small></div>
                <div><strong>{activeRoom ? `${activePartIndex + 1}/${Math.max(1, activeParts.length)}` : 'MAP'}</strong><small>CHECKPOINT</small></div>
              </div>
            </div>
          </article>

          <aside class="surface-card webmcp-now-card">
            <div class="surface-heading"><div><span>RIGHT NOW</span><h2>Agent operating envelope</h2></div><b>{webmcpNative ? 'LIVE' : 'READY'}</b></div>
            <div class="agent-envelope-list">
              <div><i>1</i><span><b>Current learner state</b><small>{activeRoom?.title || currentRoom.title} · {belief}% belief</small></span></div>
              <div><i>2</i><span><b>Available navigation</b><small>{navigationRooms.length || 0} route{navigationRooms.length === 1 ? '' : 's'} currently enterable</small></span></div>
              <div><i>3</i><span><b>Human-only guard</b><small>Video/source checkpoints cannot be counterfeited by submit_solution.</small></span></div>
              <div><i>4</i><span><b>Latest shared mutation</b><small>{activity[0]?.tool || 'Waiting for first call'}{activity[0]?.result ? ` · ${activity[0].result}` : ''}</small></span></div>
            </div>
          </aside>
        </section>

        <WebMCPBridge
          native={webmcpNative}
          tools={exposedTools}
          {activity}
          stateLabel={activeRoom?.title || currentRoom.title}
          stateDetail={`${belief}% belief · checkpoint ${activeRoom ? `${activePartIndex + 1}/${Math.max(1, activeParts.length)}` : 'map'} · ${overallProgress}% run`}
          onOpen={() => {}}
        />

        <div class="console-grid">
          <section class="surface-card state-card">
            <div class="surface-heading"><div><span>LIVE TRAJECTORY</span><h2>{currentRoom.title}</h2></div><button on:click={() => { const snapshot = actions.inspectProgress(); log('inspect_progress', 'console', `Mastery ${snapshot.masteryScore}% · ${snapshot.progress}% run`, 'read'); }}>Refresh snapshot</button></div>
            <div class="state-matrix">
              <div><small>MASTERY</small><strong>{belief}%</strong></div>
              <div><small>RUN DEPTH</small><strong>{clearedStageCount}/{stageCount}</strong></div>
              <div><small>ACTIVE ROOM</small><strong>{activeRoom?.title || 'Map'}</strong></div>
              <div><small>CHECKPOINT</small><strong>{activeRoom ? `${activePartIndex + 1}/${Math.max(1, activeParts.length)}` : '—'}</strong></div>
            </div>
            <div class="trajectory"><span>BELIEF TRAJECTORY</span>{#each beliefHistory.slice(-10) as point}<i title={`${point.belief}% · ${point.delta > 0 ? '+' : ''}${point.delta}`} style={`height:${Math.max(12, point.belief)}%`}></i>{/each}</div>
          </section>

          <section class="surface-card calls-card">
            <div class="surface-heading"><div><span>SHARED EVENT LOG</span><h2>WebMCP + learner activity</h2></div><b>{activity.length}</b></div>
            <div class="call-list">
              {#each activity.slice(0, 8) as item}
                <div><span class={`call-dot ${item.kind}`}></span><section><code>{item.tool}</code><p>{item.result}</p><small>{item.args}</small></section></div>
              {:else}
                <div class="empty-call">No tool calls yet. Open a room or invoke a WebMCP tool.</div>
              {/each}
            </div>
          </section>
        </div>

        <section class="tool-grid tool-strip">
          {#each toolCatalog as tool, index}
            <article class="tool-card" class:registered={exposedTools.includes(tool.name)}>
              <header><span class="tool-index">0{index + 1}</span><code>{tool.name}</code><span>{tool.mode}</span></header>
              <p>{tool.description}</p>
              <footer><i></i>{exposedTools.includes(tool.name) ? 'Registered now' : webmcpNative ? 'Synchronizing' : 'Available in a WebMCP-capable browser'}</footer>
            </article>
          {/each}
        </section>
      </main>
    {/if}
  </div>
{/if}

{#if showPostRun}
  <PostRunChoiceModal
    {belief}
    cleared={cleared.length}
    hasAnnex={Boolean(annexRoom)}
    onClose={() => showPostRun = false}
    onRestart={restart}
    onContinue={() => {
      showPostRun = false;
      if (annexRoom) {
        annexRoom.status = 'available';
        rooms = [...rooms];
        currentRoomId = annexRoom.refId;
      }
      scheduleToolSync();
    }}
  />
{/if}
