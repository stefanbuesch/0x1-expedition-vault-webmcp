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
      <h1>Your expeditions, ready when you are.</h1>
      <p>Forge any source into a branching run, switch between packs, and resume the exact room and checkpoint later.</p>
    </div>
    <button class="forge-main" on:click={onForge}>
      <span>＋</span>
      <div><b>Forge a new pack</b><small>YouTube · PDF · article · notes</small></div>
    </button>
  </section>

  <WebMCPBridge
    compact
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
        <div class="run-main">
          <div class="continue-meta"><span>CONTINUE CURRENT RUN</span><b>{active.sourceLabel}</b></div>
          <h2>{active.title}</h2>
          <p>{active.goal}</p>
          <div class="continue-actions">
            <button class="primary" on:click={() => onOpen(active.id)}>{active.progress >= 100 ? 'Review completed run →' : 'Resume expedition →'}</button>
            <span>{active.stageCleared}/{active.stageCount} stages · {active.roomsCleared}/{active.roomCount} rooms</span>
          </div>
        </div>
        <aside class="run-panel">
          <div class="run-progress-number"><strong>{active.progress}%</strong><small>RUN COMPLETE</small></div>
          <div class="next-room"><small>NEXT ENCOUNTER</small><b>{active.currentRoomTitle}</b><span>{active.belief}% belief · stage {Math.min(active.stageCount, active.stageCleared + 1)} of {active.stageCount}</span></div>
        </aside>
      </div>
      <div class="continue-progress"><i style={`width:${active.progress}%`}></i></div>
    </section>
  {/if}

  <section class="library-section">
    <header class="section-head">
      <div><span>KNOWLEDGE PACKS</span><h2>All expeditions</h2><p>{packs.length} {packs.length === 1 ? 'pack' : 'packs'} in your vault</p></div>
      <label class="search"><span>⌕</span><input bind:value={query} placeholder="Search packs or concepts…" /></label>
    </header>

    <div class="library-layout">
      <button class="new-card" on:click={onForge}>
        <span class="new-orb">＋</span>
        <b>Create knowledge pack</b>
        <p>Drop a PDF, paste a lecture, enter a topic, or forge directly from a URL.</p>
        <small>Start a new expedition →</small>
      </button>

      <div class="pack-grid">
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
    </div>
  </section>
</main>

<style>
  .library-page{width:min(1420px,calc(100% - 40px));margin:0 auto;padding:24px 0 64px;font-family:Inter,system-ui,sans-serif;color:#111827}.library-page :global(.bridge){margin-bottom:14px}.library-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;margin-bottom:16px}.hero-copy{max-width:920px}.eyebrow,.section-head>div>span{font-size:8px;letter-spacing:.14em;color:#5b46df;font-weight:800}.hero-copy h1{margin:7px 0 8px;font-size:39px;line-height:1.02;letter-spacing:-.052em;font-weight:760}.hero-copy p{margin:0;max-width:760px;color:#667085;font-size:12px;line-height:1.55}.forge-main{display:flex;align-items:center;gap:11px;min-width:230px;padding:11px 14px;border:1px solid #5447cf;border-radius:11px;background:#5546d7;color:#fff;box-shadow:0 10px 24px rgba(79,70,229,.18),inset 0 1px 0 rgba(255,255,255,.16);cursor:pointer;text-align:left}.forge-main>span{width:36px;height:36px;display:grid;place-items:center;border-radius:9px;background:rgba(255,255,255,.14);font-size:20px}.forge-main b,.forge-main small{display:block}.forge-main b{font-size:11px}.forge-main small{margin-top:2px;color:#e2ddff;font-size:7px}
  .continue-run{position:relative;display:grid;grid-template-columns:220px minmax(0,1fr);min-height:178px;margin-bottom:22px;border:1px solid #dfe3e9;border-radius:15px;background:#fff;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,.065)}.continue-art{position:relative;overflow:hidden;background:#e9dcc0}.map-art{position:absolute;inset:0;background:url('/assets/expedition-map.webp') center/cover no-repeat}.art-overlay{position:absolute;inset:0;background:linear-gradient(120deg,rgba(45,38,84,.08),rgba(82,70,199,.22))}.continue-art img{position:absolute;z-index:2;width:88px;height:88px;object-fit:contain;left:50%;top:50%;transform:translate(-50%,-50%);filter:drop-shadow(0 16px 18px rgba(42,33,82,.24))}.continue-copy{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:center;padding:19px 24px}.run-main{min-width:0}.continue-meta{display:flex;align-items:center;gap:10px;font-size:7px;font-weight:800;letter-spacing:.1em;color:#6254d9}.continue-meta b{padding-left:10px;border-left:1px solid #e5e7eb;color:#7b8494;letter-spacing:0}.continue-copy h2{margin:7px 0 5px;font-size:26px;line-height:1.06;letter-spacing:-.04em}.run-main>p{margin:0;max-width:740px;color:#6f7888;font-size:10px;line-height:1.5}.continue-actions{display:flex;align-items:center;gap:12px;margin-top:15px}.continue-actions .primary{border:0;border-radius:8px;background:#5546d7;color:#fff;padding:9px 13px;font-size:9px;font-weight:800;cursor:pointer;box-shadow:0 7px 16px rgba(79,70,229,.16)}.continue-actions>span{font-size:8px;color:#98a2b3}.run-panel{display:grid;grid-template-columns:86px minmax(0,1fr);gap:14px;align-items:center;padding-left:22px;border-left:1px solid #eceef2}.run-progress-number{display:flex;flex-direction:column}.run-progress-number strong{font-size:27px;line-height:1;letter-spacing:-.045em;color:#5546d7}.run-progress-number small,.next-room small{margin-top:5px;font-size:6px;letter-spacing:.11em;color:#98a2b3;font-weight:800}.next-room{min-width:0}.next-room small,.next-room b,.next-room span{display:block}.next-room b{margin-top:5px;font-size:12px;color:#202938;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.next-room span{margin-top:4px;font-size:7px;color:#7d8796}.continue-progress{position:absolute;left:220px;right:0;bottom:0;height:3px;background:#eceef4}.continue-progress i{display:block;height:100%;background:#6352db}
  .library-section{margin-top:0}.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:11px}.section-head h2{font-size:21px;letter-spacing:-.03em;margin:4px 0 2px}.section-head p{margin:0;color:#98a2b3;font-size:8px}.search{width:min(310px,38vw);height:38px;display:flex;align-items:center;gap:8px;border:1px solid #e1e5ea;border-radius:9px;background:#fff;padding:0 11px;box-shadow:0 3px 10px rgba(15,23,42,.025)}.search span{color:#98a2b3}.search input{border:0;outline:0;width:100%;font-size:9px;color:#344054;background:transparent}.library-layout{display:grid;grid-template-columns:300px minmax(0,1fr);gap:14px;align-items:stretch}.pack-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,520px));justify-content:start;gap:14px}.new-card{min-height:270px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:23px;border:1.5px dashed #d4d7e5;border-radius:15px;background:linear-gradient(145deg,#fff,#f8f7ff);text-align:left;cursor:pointer;color:#344054;transition:.18s;box-shadow:0 7px 20px rgba(15,23,42,.025)}.new-card:hover{border-color:#9e94e9;transform:translateY(-2px);box-shadow:0 13px 28px rgba(79,70,229,.07)}.new-orb{width:42px;height:42px;display:grid;place-items:center;border:1px solid #ddd8fb;background:#fff;border-radius:11px;color:#5b46df;font-size:21px;box-shadow:0 7px 18px rgba(79,70,229,.08)}.new-card b{margin-top:15px;font-size:14px}.new-card p{margin:7px 0 17px;max-width:290px;font-size:9px;line-height:1.5;color:#7b8494}.new-card small{color:#5b46df;font-size:8px;font-weight:800}.pack-card{position:relative;min-width:0;min-height:270px;border:1px solid #e1e5ea;border-radius:15px;background:#fff;overflow:hidden;box-shadow:0 9px 24px rgba(15,23,42,.055);transition:.18s}.pack-card:hover{transform:translateY(-3px);box-shadow:0 17px 34px rgba(15,23,42,.09);border-color:#cfcaf5}.pack-card.active{border-color:#a79def;box-shadow:0 0 0 2px #f0edff,0 14px 30px rgba(79,70,229,.08)}.card-click{position:absolute;inset:0;z-index:2;border:0;background:transparent;cursor:pointer}.card-art{position:relative;height:118px;overflow:hidden;background:#e8dcc0}.card-art .map-art{filter:saturate(.9) contrast(1.02)}.art-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(30,24,58,.02),rgba(25,22,48,.25))}.source-badge{position:absolute;z-index:3;left:11px;top:11px;display:flex;align-items:center;gap:5px;padding:5px 7px;border:1px solid rgba(255,255,255,.75);border-radius:999px;background:rgba(255,255,255,.9);backdrop-filter:blur(8px);color:#475467;font-size:7px;font-weight:750;box-shadow:0 4px 10px rgba(15,23,42,.06)}.source-badge i{font-style:normal;color:#5b46df}.card-crest{position:absolute;z-index:2;width:72px;height:72px;right:15px;bottom:10px;object-fit:contain;filter:drop-shadow(0 10px 13px rgba(49,36,28,.24))}.card-progress{position:absolute;z-index:4;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.55)}.card-progress i{display:block;height:100%;background:#6352db}.card-body{padding:14px}.card-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.card-title-row h3{margin:0;font-size:14px;letter-spacing:-.025em;line-height:1.2}.card-title-row>b{font-size:9px;color:#5b46df}.card-body>p{height:29px;overflow:hidden;margin:6px 0 9px;color:#7b8494;font-size:8px;line-height:1.5}.concepts{display:flex;gap:4px;overflow:hidden;min-height:21px}.concepts span{white-space:nowrap;padding:4px 6px;border:1px solid #ebedf2;border-radius:5px;background:#fafbfc;color:#667085;font-size:6px}.card-footer{position:relative;z-index:4;display:grid;grid-template-columns:auto auto 1fr auto;gap:10px;align-items:end;margin-top:10px;padding-top:10px;border-top:1px solid #f0f1f4}.card-footer div small,.card-footer div b{display:block}.card-footer div small{font-size:6px;letter-spacing:.08em;color:#a2aab7}.card-footer div b{margin-top:3px;font-size:8px}.card-footer .next{min-width:0}.card-footer .next b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card-footer button{position:relative;z-index:5;border:1px solid #ddd9f9;border-radius:7px;background:#f8f6ff;color:#5546d7;padding:7px 9px;font-size:7px;font-weight:800;cursor:pointer}
  @media(max-width:1080px){.library-layout{grid-template-columns:250px minmax(0,1fr)}.pack-grid{grid-template-columns:1fr}.continue-run{grid-template-columns:200px 1fr}.continue-progress{left:200px}.continue-copy{grid-template-columns:1fr}.run-panel{grid-template-columns:90px 1fr;padding:12px 0 0;border-left:0;border-top:1px solid #eceef2}}
  @media(max-width:720px){.library-page{width:calc(100% - 24px);padding-top:20px}.library-hero,.section-head{align-items:flex-start;flex-direction:column}.hero-copy h1{font-size:32px}.forge-main,.search{width:100%;max-width:none}.continue-run{grid-template-columns:1fr}.continue-art{height:145px}.continue-copy{padding:19px}.continue-progress{left:0}.run-panel{grid-template-columns:80px 1fr}.library-layout,.pack-grid{grid-template-columns:1fr}}
</style>
