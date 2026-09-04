<script>
  // @ts-nocheck
  import { computeNodePositions, computeSvgDimensions, getEdgePath } from './expedition-map-engine.ts';
  export let rooms = [];
  export let currentRefId = '';
  export let clearedRefIds = [];
  export let onRoomClick = () => {};
  export let seed = 0;

  function numericSeed(value) {
    const text = String(value ?? '');
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
    return hash >>> 0;
  }

  $: sourceNodes = rooms.map((room, index) => ({
    id: room.refId,
    row: Number.isFinite(room.map?.row) ? room.map.row : index,
    column: Number.isFinite(room.map?.column) ? room.map.column : 0
  }));
  $: sourcePositions = computeNodePositions(sourceNodes, { seed: numericSeed(seed) });
  $: sourceDimensions = computeSvgDimensions(sourceNodes);
  $: WIDTH = sourceDimensions.height;
  $: HEIGHT = sourceDimensions.width;
  $: displayPositions = new Map([...sourcePositions.entries()].map(([id, point]) => [id, { x: point.y, y: point.x }]));
  $: layout = (() => {
    const nodes = sourceNodes.map((meta) => ({ room: rooms.find((room) => room.refId === meta.id), row: meta.row, column: meta.column, ...(displayPositions.get(meta.id) || { x: 0, y: 0 }) }));
    const byId = new Map(nodes.map((node) => [node.room.refId, node]));
    const edges = [];
    for (const room of rooms) for (const edge of room.edges || []) if (byId.has(room.refId) && byId.has(edge.targetRefId)) edges.push({ from: byId.get(room.refId), to: byId.get(edge.targetRefId), type: edge.type || 'NEXT' });
    return { nodes, edges };
  })();

  function transposePath(pathValue) {
    return String(pathValue || '').replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${y} ${x}`);
  }
  $: mapStageCount = Math.max(1, ...layout.nodes.map((node) => Number(node.row || 0) + 1));
  $: mapCurrentStage = layout.nodes.find((node) => node.room.refId === currentRefId)?.row || 0;
  $: mapClearedStageCount = new Set(layout.nodes.filter((node) => clearedRefIds.includes(node.room.refId)).map((node) => node.row)).size;
  $: liveChoices = rooms.filter((room) => room.status === 'available' && !clearedRefIds.includes(room.refId));

  function status(room) {
    if (clearedRefIds.includes(room.refId)) return 'cleared';
    if (room.refId === currentRefId) return 'current';
    return room.status === 'available' ? 'available' : 'locked';
  }

  function path(from, to) {
    return transposePath(getEdgePath(from.room.refId, to.room.refId, sourcePositions, { seed: numericSeed(seed) }));
  }

  function iconFor(room, index) {
    if (room.status === 'locked') return '/assets/vault-crest.webp';
    const title = String(room.title || '').toLowerCase();
    if (room.nodeType === 'boss' || title.includes('commutation')) return '/assets/boss.webp';
    if (title.includes('load') || title.includes('motor')) return '/assets/gear.webp';
    if (title.includes('lenz') || title.includes('balance')) return '/assets/scales.webp';
    if (title.includes('emf')) return '/assets/lightning.webp';
    if (title.includes('faraday') || room.nodeType === 'quiz') return '/assets/book.webp';
    if (room.nodeType === 'video' || index === 0) return '/assets/crystal.webp';
    if (index === 2) return '/assets/lightning.webp';
    if (index === 3) return '/assets/scales.webp';
    return '/assets/gear.webp';
  }

  function smallIconFor(room, index) {
    return iconFor(room, index).replace('.webp', '-96.webp');
  }
</script>

<section class="board" aria-label="Interactive expedition map">
  <div class="map-wash"></div>
  <div class="board-copy">
    <span>EXPEDITION ROOM</span>
    <h2>The Knowledge Expanse</h2>
    <p>{liveChoices.length > 1 ? `${liveChoices.length} routes are live. Choose a lane; unchosen branches remain optional.` : 'Clear each concept checkpoint to unlock the path forward.'}</p>
    <button class="board-enter" on:click={() => onRoomClick(currentRefId)}>Enter current module <b>→</b></button>
  </div>

  <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    {#each layout.edges as edge}
      {@const active = clearedRefIds.includes(edge.from.room.refId) && edge.to.room.status !== 'locked'}
      <path class={`edge ${String(edge.type || 'NEXT').toLowerCase()}`} class:active d={path(edge.from, edge.to)} />
    {/each}
  </svg>

  {#each layout.nodes as node, index}
    {@const state = status(node.room)}
    <button
      class={`node ${state}`}
      style={`left:${node.x / WIDTH * 100}%;top:${node.y / HEIGHT * 100}%`}
      disabled={state === 'locked'}
      on:click={() => onRoomClick(node.room.refId)}
    >
      <span class="node-orb"><img src={smallIconFor(node.room, index)} srcset={`${smallIconFor(node.room, index)} 1x, ${iconFor(node.room, index)} 2x`} alt="" /></span>
      <strong>{node.room.title}</strong>
      <small>{state === 'cleared' ? 'Mastered' : state === 'locked' ? 'Locked' : state === 'available' && mapClearedStageCount >= mapStageCount ? 'Optional lane · replayable' : state === 'available' && liveChoices.length > 1 ? 'Available path' : node.room.subtitle || node.room.nodeType}</small>
    </button>
  {/each}

  <img class="reward reward-chest" src="/assets/reward-chest-96.webp" srcset="/assets/reward-chest-96.webp 1x, /assets/reward-chest.webp 2x" alt="" aria-hidden="true" decoding="async" fetchpriority="low" />
  <img class="reward reward-relic" src="/assets/relic-red.webp" alt="" aria-hidden="true" decoding="async" fetchpriority="low" />

  <div class="board-stats">
    <span>RUN STATS</span>
    <div><small>Current floor</small><b>{Math.min(mapStageCount, Number(mapCurrentStage) + 1)} / {mapStageCount}</b></div>
    <div><small>Run depth</small><b>{mapClearedStageCount}/{mapStageCount}</b></div>
  </div>
</section>

<style>
  .board{position:relative;min-height:452px;overflow:hidden;border:1px solid #d5d9e3;border-radius:18px;background:#eee3c9 var(--map-image) center/cover no-repeat;box-shadow:0 18px 50px rgba(15,23,42,.09),0 1px 2px rgba(15,23,42,.06)}
  .map-wash{position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(247,239,219,.09));box-shadow:inset 0 0 90px rgba(90,69,31,.08)}
  .board-copy{position:absolute;z-index:4;left:18px;top:18px;width:225px;padding:13px 14px;border:1px solid rgba(204,196,174,.9);border-radius:11px;background:rgba(255,253,246,.88);backdrop-filter:blur(7px);box-shadow:0 5px 18px rgba(75,57,25,.07)}
  .board-copy span{font-size:12px;font-weight:850;letter-spacing:.13em;color:#5145cd}.board-copy h2{margin:5px 0 4px;font-size:17px;letter-spacing:-.035em;color:#1f2937}.board-copy p{margin:0;color:#6b7280;font-size:12px;line-height:1.45}.board-enter{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;margin-top:10px;padding:7px 9px;border:1px solid #ddd7fb;border-radius:7px;background:#fff;color:#5145cd;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 2px 5px rgba(79,70,229,.05)}.board-enter:hover{background:#f5f3ff;border-color:#bdb4f5}.board-enter b{font-size:14px}
  svg{position:absolute;inset:0;width:100%;height:100%;z-index:1}.board path{fill:none;stroke:#6d695f;stroke-width:3.2;stroke-linecap:round;stroke-dasharray:7 9;opacity:.68;filter:drop-shadow(0 1px 0 rgba(255,255,255,.65))}.board path.option,.board path.branch{stroke:#756f86}.board path.gate{stroke:#9a6f2c;stroke-dasharray:3 8}.board path.active{stroke:#5b46df;opacity:.98;stroke-width:3.7}.board path.gate.active{stroke:#c08b28}
  .node{position:absolute;z-index:5;transform:translate(-50%,-50%);width:142px;border:0;background:none;text-align:center;color:#334155;cursor:pointer;padding:0}.node-orb{width:78px;height:78px;margin:auto;display:grid;place-items:center;filter:drop-shadow(0 8px 8px rgba(52,38,16,.24));transition:transform .18s,filter .18s,opacity .18s}.node-orb img{display:block;width:100%;height:100%;object-fit:contain}.node strong,.node small{display:block;max-width:140px;margin-left:auto;margin-right:auto}.node strong{margin-top:3px;width:max-content;max-width:140px;padding:3px 8px;border:1px solid rgba(204,191,154,.82);border-radius:4px;background:rgba(255,248,226,.92);font-size:13px;font-weight:800;color:#2b2b2b;box-shadow:0 2px 4px rgba(86,66,32,.08)}.node small{margin-top:2px;font-size:12px;color:#5f6368;text-shadow:0 1px rgba(255,255,255,.85)}.node.available:hover .node-orb,.node.current .node-orb{transform:translateY(-4px) scale(1.1);filter:drop-shadow(0 12px 12px rgba(79,70,229,.28)) drop-shadow(0 0 8px rgba(79,70,229,.18))}.node.current strong{border-color:#7667e8;color:#4f46e5;background:#f4f1ff}.node.cleared .node-orb{filter:drop-shadow(0 8px 8px rgba(16,185,129,.22)) saturate(.9)}.node.cleared strong{border-color:#a7d8ba;color:#167447;background:#f2fbf5}.node.locked{opacity:.56;cursor:not-allowed}.node.locked .node-orb{filter:grayscale(1) drop-shadow(0 4px 4px rgba(0,0,0,.15))}
  .reward{position:absolute;z-index:3;display:block;object-fit:contain;filter:drop-shadow(0 8px 7px rgba(65,47,20,.24));pointer-events:none}.reward-chest{width:70px;height:70px;left:52%;top:68%}.reward-relic{width:34px;height:34px;left:40%;top:48%;transform:rotate(8deg)}
  .board-stats{position:absolute;z-index:6;right:16px;top:16px;width:160px;padding:11px 12px;border:1px solid rgba(204,196,174,.9);border-radius:10px;background:rgba(255,253,246,.9);box-shadow:0 5px 18px rgba(75,57,25,.07)}.board-stats>span{display:block;margin-bottom:7px;font-size:12px;font-weight:850;letter-spacing:.12em;color:#5145cd}.board-stats div{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;border-top:1px solid rgba(220,213,193,.55)}.board-stats small{font-size:12px;color:#6b7280}.board-stats b{font-size:12px;color:#111827}
  @media(max-width:760px){.board{min-height:500px;background-position:42% center}.board-copy{width:190px}.board-stats{top:auto;bottom:12px}.node{width:110px}.node-orb{width:54px;height:54px}.node strong{max-width:108px;font-size:12px}.reward{display:none}}
</style>
