<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  import { cloneKnowledgePack } from '$lib/learning/knowledgepack.js';
  import { generateKnowledgePackFromMaterial, extractYoutubeVideoId } from '$lib/learning/ingestion.js';
  import { createLearningWebMCP } from '$lib/learning/webmcp.js';
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
  let activeTab = 'library';
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

  const toolCatalog = [
    { name: 'ingest_learning_material', mode: 'WRITE', description: 'Forge a new branching expedition from a topic, URL, transcript, article, or extracted document.' },
    { name: 'explore_module', mode: 'WRITE', description: 'Enter an available room at its current checkpoint without bypassing prerequisite gates.' },
    { name: 'submit_solution', mode: 'WRITE', description: 'Submit against the same quiz/recall checkpoint the learner sees; video checkpoints refuse agent completion.' },
    { name: 'inspect_progress', mode: 'READ', description: 'Read mastery, run depth, active checkpoint, evidence trail, source provenance, and belief trajectory.' }
  ];

  let ingestTitle = '';
  let ingestUrl = '';
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

  function persistVault() {
    if (!storageReady || typeof window === 'undefined') return;
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify({ activePackId, packs: packLibrary }));
    } catch {
      // The app remains fully usable if browser storage is unavailable.
    }
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

  function scheduleToolSync(saveRun = true) {
    if (typeof window !== 'undefined') setTimeout(() => {
      syncTools();
      if (saveRun) upsertCurrentPack();
    }, 0);
  }

  function applyBelief(delta, actor = 'human', roomId = activeRoomId || currentRoomId) {
    beliefDelta = delta;
    belief = Math.max(5, Math.min(98, belief + delta));
    beliefHistory = [...beliefHistory, { index: beliefHistory.length, belief, delta, roomId, actor }];
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
    const expected = targetPart.expected || targetPart.checklist || [];
    if (!expected.length) {
      const words = text.split(/\s+/).filter(Boolean).length;
      const score = Math.min(1, words / (room.nodeType === 'boss' ? 70 : 34));
      return { success: score >= 0.68, score, detail: `Mechanism depth ${Math.round(score * 100)}%.` };
    }
    let hits = 0;
    for (const item of expected) {
      const tokens = String(item).toLowerCase().split(/[^a-z0-9-]+/).filter((token) => token.length > 3);
      if (tokens.some((token) => text.includes(token))) hits += 1;
    }
    const causalMarkers = (text.match(/\b(because|therefore|thus|causes?|leads?|results?|mechanism|evidence|predict|falsif)\w*/g) || []).length;
    const score = expected.length ? hits / expected.length : 0;
    const requiresCausality = ['dialogue', 'case-study', 'boss'].includes(targetPart.type) || room.nodeType === 'boss' || room.refId.includes('causal') || room.refId.includes('transfer');
    return { success: score >= 0.6 && (!requiresCausality || causalMarkers >= 1), score, detail: `Causal coverage ${Math.round(score * 100)}%.` };
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
      const stored = JSON.parse(localStorage.getItem(VAULT_STORAGE_KEY) || 'null');
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
      activeTab = 'library';
    }

    const saveBeforeExit = () => {
      if (activeTab === 'library') persistVault();
      else upsertCurrentPack();
    };
    window.addEventListener('beforeunload', saveBeforeExit);
    timer = setInterval(() => {
      elapsed += 1;
      if (elapsed % 10 === 0 && activeTab !== 'library') upsertCurrentPack();
    }, 1000);
    return () => {
      if (activeTab === 'library') persistVault();
      else upsertCurrentPack();
      window.removeEventListener('beforeunload', saveBeforeExit);
      clearInterval(timer);
      adapter?.destroy();
    };
  });
</script>

<svelte:head>
  <title>0x1 Expedition Vault // {pack.title}</title>
  <meta name="description" content="An agent-native learning roguelike powered by WebMCP." />
  <meta name="theme-color" content="#f7f8fb" />
  <link rel="icon" type="image/webp" href="/assets/vault-crest.webp" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
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
          <span class="brand-mark">◇</span>
          <span><b>0x1 Expedition Vault</b><small>Learning Roguelike</small></span>
        </button>
        <nav class="primary-nav">
          <button class:active={activeTab === 'library'} on:click={goLibrary}>Vault</button>
          <button class:active={activeTab === 'classroom'} on:click={() => { upsertCurrentPack(); activeTab = 'classroom'; mode = 'map'; }}>Current Run</button>
          <button class:active={activeTab === 'pack'} on:click={() => { upsertCurrentPack(); activeTab = 'pack'; }}>Pack Details</button>
          <button class:active={activeTab === 'ingest'} on:click={() => { upsertCurrentPack(); activeTab = 'ingest'; }}>Forge</button>
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
        {activity}
        onOpen={(id) => restorePack(id, true)}
        onForge={() => { upsertCurrentPack(); activeTab = 'ingest'; }}
        onAgent={() => { upsertCurrentPack(); activeTab = 'agent'; }}
      />
    {:else if activeTab === 'ingest'}
      <main class="forge-page">
        <button class="back-link" on:click={goLibrary}>← Back to vault</button>
        <section class="forge-hero">
          <div class="forge-copy">
            <span>KNOWLEDGE PACK FORGE</span>
            <h1>Turn any source into a playable expedition.</h1>
            <p>Topic, YouTube lecture, public article/PDF URL, pasted notes, markdown, or a PDF/text upload. The source becomes one branching run state shared by the learner and WebMCP.</p>
            <div class="forge-source-grid">
              <div><i>▶</i><span><b>YouTube</b><small>Video + public transcript</small></span></div>
              <div><i>↗</i><span><b>Web</b><small>Article or public PDF URL</small></span></div>
              <div><i>▤</i><span><b>Files</b><small>PDF · TXT · Markdown</small></span></div>
              <div><i>¶</i><span><b>Notes</b><small>Paste raw text or a topic</small></span></div>
            </div>
            <div class="forge-pipeline"><span>EXTRACT</span><i></i><span>MODEL</span><i></i><span>BRANCH</span><i></i><span>PROVE</span></div>
          </div>
          <div class="forge-form">
            <label>Topic or course title<input bind:value={ingestTitle} placeholder="e.g. Plate tectonics" /></label>
            <label>Source URL<input bind:value={ingestUrl} placeholder="https://youtube.com/watch?v=…" /></label>
            <label class="wide">Notes / transcript<textarea bind:value={ingestContent} rows="7" placeholder="Paste text, transcript, lecture notes, or article excerpts…"></textarea></label>
            <label class="file-drop wide"><span>{isExtractingSource ? 'Extracting document…' : uploadedFileName ? `Ready · ${uploadedFileName}` : 'Drop in a PDF, TXT, or Markdown file'}</span><input type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" on:change={handleFileUpload} /></label>
            {#if ingestError}<div class="form-error wide">{ingestError}</div>{/if}
            <button class="forge-submit wide" disabled={isIngesting || isExtractingSource} on:click={handleIngestMaterial}>{isIngesting ? 'Forging branching expedition…' : 'Forge Knowledge Pack'}</button>
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

        <WebMCPBridge
          compact
          native={webmcpNative}
          tools={exposedTools}
          {activity}
          stateLabel={`${currentRoom.title} · stage ${Math.min(stageCount, currentStage + 1)}/${stageCount}`}
          stateDetail={`${belief}% belief · ${clearedStageCount}/${stageCount} stages cleared · ${navigationRooms.length || 0} live route${navigationRooms.length === 1 ? '' : 's'}`}
          onOpen={() => activeTab = 'agent'}
        />

        <div class="vault-grid">
          <section class="hero-column">
            <DungeonMap rooms={rooms} currentRefId={currentRoomId} clearedRefIds={cleared} onRoomClick={openRoom} />
            <section class="forge-bar" class:grounded={Boolean(sourceGroundingTitle)}>
              <div class="forge-icon">{sourceGroundingTitle ? '✓' : '↗'}</div>
              <div>
                <b>{sourceGroundingTitle || 'Generate a Knowledge Pack from any source'}</b>
                <span>{sourceGroundingTitle ? sourceGroundingDetail : 'Paste a topic, YouTube lecture, article, PDF, or notes and start a new run instantly.'}</span>
              </div>
              <button on:click={() => activeTab = 'ingest'}>{sourceGroundingTitle ? 'Forge another' : 'Open Forge'}</button>
            </section>
          </section>

          <aside class="right-rail">
            <section class="rail-card route-card">
              <div class="rail-heading"><b>{navigationRooms.length > 1 ? 'Choose your route' : overallProgress >= 100 ? 'Expedition complete' : 'Next move'}</b><span>Stage {Math.min(stageCount, currentStage + 1)} / {stageCount}</span></div>
              {#if navigationRooms.length}
                <p>{navigationRooms.length > 1 ? 'Two viable paths are open. Pick the lane you want to prove next.' : 'Your next encounter is ready. Jump straight in or inspect it on the map.'}</p>
                <div class="route-options">
                  {#each navigationRooms.slice(0, 3) as room}
                    <button class:recommended={room.refId === currentRoomId} on:click={() => openRoom(room.refId)}>
                      <span><b>{room.title}</b><small>{room.subtitle || room.nodeType}</small></span>
                      <i>{room.refId === currentRoomId ? 'Enter →' : 'Choose →'}</i>
                    </button>
                  {/each}
                </div>
              {:else}
                <div class="run-complete-mini"><img src="/assets/boss.webp" alt="" /><span><b>Run cleared</b><small>6-stage path complete. Optional rooms remain available from the curriculum.</small></span></div>
              {/if}
            </section>

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

            <section class="rail-card curriculum-card">
              <div class="rail-heading"><b>Curriculum</b><span>{rooms.length} rooms</span></div>
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
              <div class="rail-heading"><b>WebMCP Co-Pilot</b><span class="live-dot">{webmcpNative ? 'Native · live' : '4 tools ready'}</span></div>
              <p>Browser agents discover these tools from <code>document.modelContext</code> and mutate the same run state shown on this map.</p>
              <div class="tool-chips">{#each (exposedTools.length ? exposedTools : ['ingest_learning_material', 'explore_module', 'submit_solution', 'inspect_progress']) as tool}<code>{tool}</code>{/each}</div>
              {#if activity.length}<div class="agent-event"><small>LATEST SHARED MUTATION</small><b>{activity[0].tool}</b><span>{activity[0].result}</span></div>{/if}
              <button class="agent-console-cta" on:click={() => activeTab = 'agent'}>Open WebMCP Console →</button>
            </section>
          </aside>
        </div>
      </main>
    {:else if activeTab === 'pack'}
      <main class="product-page">
        <div class="product-heading">
          <div><span>KNOWLEDGE PACK / LIVE ARTIFACT</span><h1>{pack.title}</h1><p>The exact source, concepts, graph topology, and checkpoints driving the current expedition.</p></div>
          <button class="secondary-action" on:click={() => activeTab = 'classroom'}>Open expedition →</button>
        </div>

        <div class="inspect-grid">
          <section class="surface-card source-card">
            <div class="surface-heading"><div><span>SOURCE GROUNDING</span><h2>{sourceGroundingTitle || pack.source?.type || 'Bundled knowledge pack'}</h2></div><b>{pack.seed}</b></div>
            <p>{sourceGroundingDetail || pack.goal}</p>
            {#if pack.source?.url}<div class="source-url">{pack.source.url}</div>{/if}
            <div class="source-metrics">
              <div><small>PROVENANCE</small><strong>{pack.source?.provenance || 'bundled'}</strong></div>
              <div><small>EXTRACTED</small><strong>{pack.source?.extractedCharacters || pack.source?.characterCount || 0} chars</strong></div>
              <div><small>TRANSCRIPT</small><strong>{pack.source?.transcriptStatus || 'n/a'}</strong></div>
              <div><small>RUN SHAPE</small><strong>{stageCount} stages · {rooms.length} rooms</strong></div>
            </div>
          </section>

          <section class="surface-card concept-card">
            <div class="surface-heading"><div><span>CONCEPT MODEL</span><h2>What the expedition extracted</h2></div><b>{(pack.concepts || []).length || rooms.length}</b></div>
            <div class="concept-cloud">
              {#each ((pack.concepts || []).length ? pack.concepts : rooms.map((room) => room.title)) as concept}
                <span>{concept}</span>
              {/each}
            </div>
            <div class="goal-box"><small>MISSION THESIS</small><p>{pack.goal}</p></div>
          </section>
        </div>

        <section class="surface-card topology-card">
          <div class="surface-heading"><div><span>CURRICULUM GRAPH</span><h2>Branching room topology</h2></div><b>{pack.template || 'expedition'}</b></div>
          <div class="topology-list">
            {#each rooms as room, index}
              {@const parts = Array.isArray(room.parts) && room.parts.length ? room.parts : [room.part].filter(Boolean)}
              <div class="topology-row">
                <span class="topology-index">{index + 1}</span>
                <div class="topology-copy"><b>{room.title}</b><small>Stage {Number.isFinite(room.map?.row) ? room.map.row + 1 : index + 1} · {room.status} · {parts.length} checkpoint{parts.length === 1 ? '' : 's'}</small></div>
                <div class="part-tags">{#each parts as part}<code>{part.type}</code>{#if part.cognitionCheck}<code class="cognition-tag">cognition · {part.cognitionCheck.kind}</code>{/if}{/each}</div>
                <div class="edge-tags">{#each room.edges || [] as edge}<span>{edge.type} → {rooms.find((candidate) => candidate.refId === edge.targetRefId)?.title || edge.targetRefId}</span>{/each}</div>
              </div>
            {/each}
          </div>
        </section>
      </main>
    {:else if activeTab === 'agent'}
      <main class="product-page agent-console-page">
        <div class="product-heading">
          <div><span>WEBMCP / DOCUMENT.MODELCONTEXT</span><h1>WebMCP Console</h1><p>Native browser tools and learner UI operate on one expedition state: same rooms, same gates, same checkpoint index, same mastery trajectory.</p></div>
          <div class:webmcp-on={webmcpNative} class="console-status"><i></i>{webmcpNative ? 'document.modelContext live' : 'Browser tool surface ready'}</div>
        </div>

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
            <div class="surface-heading"><div><span>LIVE STATE</span><h2>{currentRoom.title}</h2></div><button on:click={() => { const snapshot = actions.inspectProgress(); log('inspect_progress', 'console', `Mastery ${snapshot.masteryScore}% · ${snapshot.progress}% run`, 'read'); }}>Refresh snapshot</button></div>
            <div class="state-matrix">
              <div><small>MASTERY</small><strong>{belief}%</strong></div>
              <div><small>RUN DEPTH</small><strong>{clearedStageCount}/{stageCount}</strong></div>
              <div><small>ACTIVE ROOM</small><strong>{activeRoom?.title || 'Map'}</strong></div>
              <div><small>CHECKPOINT</small><strong>{activeRoom ? `${activePartIndex + 1}/${Math.max(1, activeParts.length)}` : '—'}</strong></div>
            </div>
            <div class="trajectory"><span>BELIEF TRAJECTORY</span>{#each beliefHistory.slice(-10) as point}<i title={`${point.belief}% · ${point.delta > 0 ? '+' : ''}${point.delta}`} style={`height:${Math.max(12, point.belief)}%`}></i>{/each}</div>
          </section>

          <section class="surface-card calls-card">
            <div class="surface-heading"><div><span>RECENT ACTIVITY</span><h2>WebMCP + learner events</h2></div><b>{activity.length}</b></div>
            <div class="call-list">
              {#each activity.slice(0, 8) as item}
                <div><span class={`call-dot ${item.kind}`}></span><section><code>{item.tool}</code><p>{item.result}</p><small>{item.args}</small></section></div>
              {:else}
                <div class="empty-call">No tool calls yet. Open a room or invoke a WebMCP tool.</div>
              {/each}
            </div>
          </section>
        </div>

        <section class="tool-grid">
          {#each toolCatalog as tool}
            <article class="tool-card" class:registered={exposedTools.includes(tool.name)}>
              <header><code>{tool.name}</code><span>{tool.mode}</span></header>
              <p>{tool.description}</p>
              <footer><i></i>{exposedTools.includes(tool.name) ? 'Registered now' : webmcpNative ? 'Synchronizing' : 'Available when WebMCP is present'}</footer>
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
