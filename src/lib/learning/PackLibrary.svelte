<script>
  // @ts-nocheck
  import WebMCPBridge from './WebMCPBridge.svelte';
  export let packs = [];
  export let activePackId = '';
  export let webmcpNative = false;
  export let webmcpTools = [];
  export let activity = [];
  export let onOpen = () => {};
  export let onForge = () => {};
  export let onAgent = () => {};

  let query = '';
  $: filtered = packs.filter((item) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${item.title} ${item.sourceLabel} ${(item.concepts || []).join(' ')}`.toLowerCase().includes(needle);
  });
  $: active = packs.find((item) => item.id === activePackId) || packs[0] || null;

  function badgeIcon(item) {
    if (item.sourceKind === 'youtube') return '▶';
    if (item.sourceKind === 'upload') return '▤';
    if (item.sourceKind === 'url') return '↗';
    if (item.sourceKind === 'pasted-text') return '¶';
    return '✦';
  }
</script>

<main class="library-page">
  <section class="library-hero">
    <div class="hero-copy">
      <span class="eyebrow">EXPEDITION VAULT</span>
      <h1>Learning worlds that remember where you left off.</h1>
      <p>Forge any source into a branching expedition, switch between packs, and resume the exact room and checkpoint later.</p>
    </div>
    <button class="forge-main" on:click={onForge}><span>＋</span><div><b>Forge a new pack</b><small>YouTube · PDF · article · notes</small></div></button>
  </section>

  <WebMCPBridge
    native={webmcpNative}
    tools={webmcpTools}
    {activity}
    stateLabel={active ? active.title : 'Expedition vault'}
    stateDetail={active ? `${active.currentRoomTitle} · ${active.progress}% run · ${active.belief}% belief` : 'Forge, inspect, navigate, and solve through the same browser-visible state.'}
    onOpen={onAgent}
  />

  {#if active}
    <section class="continue-run">
      <div class="continue-art">
        <div class="map-art"></div>
        <div class="art-overlay"></div>
        <img src="/assets/vault-crest.webp" alt="" />
      </div>
      <div class="continue-copy">
        <div class="continue-meta"><span>CONTINUE CURRENT RUN</span><b>{active.progress}% complete</b></div>
        <h2>{active.title}</h2>
        <p>{active.goal}</p>
        <div class="continue-stats">
          <div><small>STAGES</small><b>{active.stageCleared}/{active.stageCount}</b></div>
          <div><small>ROOMS</small><b>{active.roomsCleared}/{active.roomCount}</b></div>
          <div><small>BELIEF</small><b>{active.belief}%</b></div>
          <div class="next"><small>NEXT</small><b>{active.currentRoomTitle}</b></div>
        </div>
        <div class="continue-actions">
          <button class="primary" on:click={() => onOpen(active.id)}>{active.progress >= 100 ? 'Review completed run →' : 'Resume expedition →'}</button>
          <span>{active.sourceLabel}</span>
        </div>
      </div>
      <div class="continue-progress"><i style={`width:${active.progress}%`}></i></div>
    </section>
  {/if}

  <section class="library-section">
    <header class="section-head">
      <div><span>KNOWLEDGE PACKS</span><h2>All expeditions</h2><p>{packs.length} {packs.length === 1 ? 'pack' : 'packs'} in your vault</p></div>
      <label class="search"><span>⌕</span><input bind:value={query} placeholder="Search packs or concepts…" /></label>
    </header>

    <div class="pack-grid">
      <button class="new-card" on:click={onForge}>
        <span class="new-orb">＋</span>
        <b>Create knowledge pack</b>
        <p>Drop a PDF, paste a lecture, enter a topic, or forge directly from a URL.</p>
        <small>Start a new expedition →</small>
      </button>

      {#each filtered as item}
        <article class:active={item.id === activePackId} class="pack-card">
          <button class="card-click" on:click={() => onOpen(item.id)} aria-label={`Open ${item.title}`}></button>
          <div class="card-art">
            <div class="map-art"></div>
            <div class="art-shade"></div>
            <span class="source-badge"><i>{badgeIcon(item)}</i>{item.sourceLabel}</span>
            <img class="card-crest" src={item.isBossComplete ? '/assets/boss.webp' : '/assets/vault-crest.webp'} alt="" />
            <div class="card-progress"><i style={`width:${item.progress}%`}></i></div>
          </div>
          <div class="card-body">
            <div class="card-title-row"><h3>{item.title}</h3><b>{item.progress}%</b></div>
            <p>{item.goal}</p>
            <div class="concepts">{#each (item.concepts || []).slice(0, 4) as concept}<span>{concept}</span>{/each}</div>
            <div class="card-footer">
              <div><small>RUN</small><b>{item.stageCleared}/{item.stageCount}</b></div>
              <div><small>MASTERY</small><b>{item.belief}%</b></div>
              <div class="next"><small>NEXT</small><b>{item.currentRoomTitle}</b></div>
              <button on:click={() => onOpen(item.id)}>{item.progress >= 100 ? 'Review' : item.progress ? 'Continue' : 'Start'} →</button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  </section>
</main>

<style>
  .library-page{width:min(1420px,calc(100% - 40px));margin:0 auto;padding:28px 0 72px;font-family:Inter,system-ui,sans-serif;color:#111827}.library-page :global(.bridge){margin-bottom:18px}.library-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;margin-bottom:20px}.hero-copy{max-width:760px}.eyebrow,.section-head>div>span{font-size:8px;letter-spacing:.14em;color:#5b46df;font-weight:800}.hero-copy h1{margin:7px 0 8px;font-size:36px;line-height:1.04;letter-spacing:-.045em;font-weight:760;color:#111827}.hero-copy p{margin:0;max-width:700px;color:#667085;font-size:12px;line-height:1.6}.forge-main{display:flex;align-items:center;gap:11px;min-width:240px;padding:11px 14px;border:1px solid #5447cf;border-radius:11px;background:#5546d7;color:#fff;box-shadow:0 10px 24px rgba(79,70,229,.18),inset 0 1px 0 rgba(255,255,255,.16);cursor:pointer;text-align:left}.forge-main>span{width:36px;height:36px;display:grid;place-items:center;border-radius:9px;background:rgba(255,255,255,.14);font-size:20px}.forge-main b,.forge-main small{display:block}.forge-main b{font-size:11px}.forge-main small{margin-top:2px;color:#e2ddff;font-size:7px}.continue-run{position:relative;display:grid;grid-template-columns:250px minmax(0,1fr);min-height:215px;margin-bottom:30px;border:1px solid #dfe3e9;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 14px 36px rgba(15,23,42,.07)}.continue-art{position:relative;overflow:hidden;background:#e9dcc0}.map-art{position:absolute;inset:0;background:url('/assets/expedition-map.webp') center/cover no-repeat}.art-overlay{position:absolute;inset:0;background:linear-gradient(120deg,rgba(45,38,84,.08),rgba(82,70,199,.22))}.continue-art img{position:absolute;z-index:2;width:104px;height:104px;object-fit:contain;left:50%;top:50%;transform:translate(-50%,-50%);filter:drop-shadow(0 18px 20px rgba(42,33,82,.25))}.continue-copy{padding:24px 28px}.continue-meta{display:flex;justify-content:space-between;gap:20px;font-size:7px;font-weight:800;letter-spacing:.1em;color:#6254d9}.continue-meta b{color:#667085;letter-spacing:0}.continue-copy h2{margin:8px 0 6px;font-size:25px;line-height:1.08;letter-spacing:-.04em;font-weight:750}.continue-copy>p{margin:0;max-width:760px;color:#6f7888;font-size:10px;line-height:1.55}.continue-stats{display:grid;grid-template-columns:80px 80px 80px minmax(130px,1fr);gap:7px;margin:17px 0}.continue-stats div{padding:8px 9px;border:1px solid #eceef2;border-radius:8px;background:#fafbfc;min-width:0}.continue-stats small,.continue-stats b{display:block}.continue-stats small{font-size:6px;letter-spacing:.1em;color:#98a2b3}.continue-stats b{margin-top:3px;font-size:9px;color:#273244;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.continue-actions{display:flex;align-items:center;gap:12px}.continue-actions .primary{border:0;border-radius:8px;background:#5546d7;color:#fff;padding:9px 13px;font-size:9px;font-weight:800;cursor:pointer;box-shadow:0 7px 16px rgba(79,70,229,.16)}.continue-actions>span{font-size:8px;color:#98a2b3}.continue-progress{position:absolute;left:250px;right:0;bottom:0;height:3px;background:#eceef4}.continue-progress i{display:block;height:100%;background:#6352db}.library-section{margin-top:2px}.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:14px}.section-head h2{font-size:20px;letter-spacing:-.03em;margin:4px 0 2px;font-weight:720}.section-head p{margin:0;color:#98a2b3;font-size:8px}.search{width:min(310px,38vw);height:38px;display:flex;align-items:center;gap:8px;border:1px solid #e1e5ea;border-radius:9px;background:#fff;padding:0 11px;box-shadow:0 3px 10px rgba(15,23,42,.025)}.search span{color:#98a2b3}.search input{border:0;outline:0;width:100%;font-size:9px;color:#344054;background:transparent}.pack-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.new-card{min-height:315px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:26px;border:1.5px dashed #d4d7e5;border-radius:15px;background:linear-gradient(145deg,#fff,#f8f7ff);text-align:left;cursor:pointer;color:#344054;transition:.18s;box-shadow:0 7px 20px rgba(15,23,42,.025)}.new-card:hover{border-color:#9e94e9;transform:translateY(-2px);box-shadow:0 13px 28px rgba(79,70,229,.07)}.new-orb{width:46px;height:46px;display:grid;place-items:center;border:1px solid #ddd8fb;background:#fff;border-radius:11px;color:#5b46df;font-size:22px;box-shadow:0 7px 18px rgba(79,70,229,.08)}.new-card b{margin-top:18px;font-size:14px}.new-card p{margin:7px 0 18px;max-width:290px;font-size:9px;line-height:1.55;color:#7b8494}.new-card small{color:#5b46df;font-size:8px;font-weight:800}.pack-card{position:relative;min-width:0;border:1px solid #e1e5ea;border-radius:15px;background:#fff;overflow:hidden;box-shadow:0 9px 24px rgba(15,23,42,.055);transition:.18s}.pack-card:hover{transform:translateY(-3px);box-shadow:0 17px 34px rgba(15,23,42,.09);border-color:#cfcaf5}.pack-card.active{border-color:#a79def;box-shadow:0 0 0 2px #f0edff,0 14px 30px rgba(79,70,229,.08)}.card-click{position:absolute;inset:0;z-index:2;border:0;background:transparent;cursor:pointer}.card-art{position:relative;height:140px;overflow:hidden;background:#e8dcc0}.card-art .map-art{filter:saturate(.9) contrast(1.02)}.art-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(30,24,58,.02),rgba(25,22,48,.25))}.source-badge{position:absolute;z-index:3;left:11px;top:11px;display:flex;align-items:center;gap:5px;padding:5px 7px;border:1px solid rgba(255,255,255,.75);border-radius:999px;background:rgba(255,255,255,.9);backdrop-filter:blur(8px);color:#475467;font-size:7px;font-weight:750;box-shadow:0 4px 10px rgba(15,23,42,.06)}.source-badge i{font-style:normal;color:#5b46df}.card-crest{position:absolute;z-index:2;width:78px;height:78px;right:16px;bottom:11px;object-fit:contain;filter:drop-shadow(0 11px 14px rgba(49,36,28,.25))}.card-progress{position:absolute;z-index:4;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.55)}.card-progress i{display:block;height:100%;background:#6352db}.card-body{padding:15px}.card-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.card-title-row h3{margin:0;font-size:14px;letter-spacing:-.025em;line-height:1.2}.card-title-row>b{font-size:9px;color:#5b46df}.card-body>p{height:31px;overflow:hidden;margin:6px 0 9px;color:#7b8494;font-size:8px;line-height:1.55}.concepts{display:flex;gap:4px;overflow:hidden;min-height:21px}.concepts span{white-space:nowrap;padding:4px 6px;border:1px solid #ebedf2;border-radius:5px;background:#fafbfc;color:#667085;font-size:6px}.card-footer{position:relative;z-index:4;display:grid;grid-template-columns:auto auto 1fr auto;gap:10px;align-items:end;margin-top:12px;padding-top:11px;border-top:1px solid #f0f1f4}.card-footer div small,.card-footer div b{display:block}.card-footer div small{font-size:6px;letter-spacing:.08em;color:#a2aab7}.card-footer div b{margin-top:3px;font-size:8px}.card-footer .next{min-width:0}.card-footer .next b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card-footer button{position:relative;z-index:5;border:1px solid #ddd9f9;border-radius:7px;background:#f8f6ff;color:#5546d7;padding:7px 9px;font-size:7px;font-weight:800;cursor:pointer}@media(max-width:1080px){.pack-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.continue-run{grid-template-columns:220px 1fr}.continue-progress{left:220px}.continue-stats{grid-template-columns:repeat(2,1fr)}}@media(max-width:720px){.library-page{width:calc(100% - 24px);padding-top:22px}.library-hero,.section-head{align-items:flex-start;flex-direction:column}.forge-main,.search{width:100%;max-width:none}.continue-run{grid-template-columns:1fr}.continue-art{height:155px}.continue-progress{left:0}.pack-grid{grid-template-columns:1fr}.hero-copy h1{font-size:31px}}
</style>
