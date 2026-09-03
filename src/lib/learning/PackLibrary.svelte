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
      <h1>Your learning worlds, in one place.</h1>
      <p>Forge a source into a branching expedition, leave it, come back, and resume exactly where the run stands.</p>
    </div>
    <button class="forge-main" on:click={onForge}><span>＋</span><b>Forge a new pack</b><small>YouTube · PDF · article · notes</small></button>
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
        <img src="/assets/vault-crest.webp" alt="" />
      </div>
      <div class="continue-copy">
        <div class="continue-meta"><span>CONTINUE CURRENT RUN</span><b>{active.progress}% complete</b></div>
        <h2>{active.title}</h2>
        <p>{active.goal}</p>
        <div class="continue-stats">
          <span><b>{active.stageCleared}/{active.stageCount}</b> stages</span>
          <span><b>{active.roomsCleared}/{active.roomCount}</b> rooms</span>
          <span><b>{active.belief}%</b> belief</span>
          <span><b>{active.currentRoomTitle}</b> next</span>
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
  .library-page{width:min(1440px,calc(100% - 48px));margin:0 auto;padding:34px 0 80px;font-family:Inter,system-ui,sans-serif}.library-page :global(.bridge){margin-bottom:24px}.library-hero{display:flex;align-items:end;justify-content:space-between;gap:30px;margin-bottom:24px}.hero-copy{max-width:740px}.eyebrow,.section-head>div>span{font-size:9px;letter-spacing:.14em;color:#5b46df;font-weight:850}.hero-copy h1{margin:8px 0 10px;font-size:clamp(34px,4vw,52px);line-height:1;letter-spacing:-.06em;color:#111827}.hero-copy p{margin:0;color:#667085;font-size:13px;line-height:1.6}.forge-main{display:grid;grid-template-columns:40px 1fr;column-gap:10px;align-items:center;text-align:left;min-width:250px;padding:12px 15px;border:1px solid #ddd9ff;border-radius:14px;background:linear-gradient(135deg,#5c4ae0,#725de8);color:#fff;box-shadow:0 14px 34px rgba(79,70,229,.2);cursor:pointer}.forge-main>span{grid-row:1/3;width:38px;height:38px;display:grid;place-items:center;border-radius:10px;background:rgba(255,255,255,.14);font-size:22px}.forge-main b{font-size:12px}.forge-main small{margin-top:2px;color:#ddd8ff;font-size:8px}.continue-run{position:relative;display:grid;grid-template-columns:260px 1fr;min-height:230px;border:1px solid #dcdfe7;border-radius:20px;background:#fff;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,.08);margin-bottom:38px}.continue-art{position:relative;overflow:hidden;background:#e8dcc0}.map-art{position:absolute;inset:0;background:url('/assets/expedition-map.webp') center/cover no-repeat}.continue-art:after{content:'';position:absolute;inset:0;background:linear-gradient(120deg,rgba(39,32,71,.16),rgba(79,70,229,.32))}.continue-art img{position:absolute;z-index:2;width:112px;height:112px;object-fit:contain;left:50%;top:50%;transform:translate(-50%,-50%);filter:drop-shadow(0 18px 22px rgba(33,27,77,.28))}.continue-copy{padding:26px 30px}.continue-meta{display:flex;justify-content:space-between;gap:20px;color:#6254d9;font-size:8px;font-weight:850;letter-spacing:.1em}.continue-meta b{color:#475467;letter-spacing:0}.continue-copy h2{font-size:26px;letter-spacing:-.045em;margin:9px 0 7px}.continue-copy>p{margin:0;max-width:760px;color:#667085;font-size:11px;line-height:1.55}.continue-stats{display:flex;flex-wrap:wrap;gap:8px;margin:19px 0}.continue-stats span{padding:7px 9px;border:1px solid #eceef2;border-radius:8px;background:#fafbfc;color:#7b8494;font-size:8px}.continue-stats b{color:#1f2937;margin-right:3px}.continue-actions{display:flex;align-items:center;gap:14px}.continue-actions .primary{border:0;border-radius:9px;background:#5546d7;color:#fff;padding:10px 14px;font-size:10px;font-weight:800;cursor:pointer}.continue-actions>span{font-size:8px;color:#8a93a3}.continue-progress{position:absolute;left:260px;right:0;bottom:0;height:4px;background:#eceef4}.continue-progress i{display:block;height:100%;background:linear-gradient(90deg,#5b46df,#8e7ef1)}.library-section{margin-top:4px}.section-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:15px}.section-head h2{font-size:21px;letter-spacing:-.035em;margin:4px 0 2px}.section-head p{margin:0;color:#98a2b3;font-size:9px}.search{width:min(320px,40vw);height:40px;display:flex;align-items:center;gap:8px;border:1px solid #e0e4ea;border-radius:10px;background:#fff;padding:0 11px}.search span{color:#98a2b3}.search input{border:0;outline:0;width:100%;font-size:10px;color:#344054}.pack-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.new-card{min-height:330px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:28px;border:1.5px dashed #cfd3e6;border-radius:17px;background:linear-gradient(145deg,#fbfbff,#f6f5ff);text-align:left;cursor:pointer;color:#344054}.new-card:hover{border-color:#8d80ea;transform:translateY(-2px)}.new-orb{width:50px;height:50px;display:grid;place-items:center;border:1px solid #ded9ff;background:#fff;border-radius:13px;color:#5b46df;font-size:25px;box-shadow:0 8px 22px rgba(79,70,229,.08)}.new-card b{margin-top:20px;font-size:15px}.new-card p{margin:8px 0 20px;font-size:10px;line-height:1.55;color:#7b8494}.new-card small{color:#5b46df;font-size:9px;font-weight:800}.pack-card{position:relative;min-width:0;border:1px solid #e1e4ea;border-radius:17px;background:#fff;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.045);transition:.18s}.pack-card:hover{transform:translateY(-3px);box-shadow:0 16px 38px rgba(15,23,42,.09);border-color:#cfcaf5}.pack-card.active{border-color:#9f93ed;box-shadow:0 0 0 2px #f0edff,0 14px 32px rgba(79,70,229,.1)}.card-click{position:absolute;inset:0;z-index:2;border:0;background:transparent;cursor:pointer}.card-art{position:relative;height:145px;overflow:hidden;background:#e8dcc0}.card-art .map-art{filter:saturate(.9)}.art-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(30,24,58,.04),rgba(25,22,48,.28))}.source-badge{position:absolute;z-index:3;left:12px;top:12px;display:flex;align-items:center;gap:5px;padding:5px 7px;border:1px solid rgba(255,255,255,.7);border-radius:999px;background:rgba(255,255,255,.86);backdrop-filter:blur(8px);color:#475467;font-size:7px;font-weight:750}.source-badge i{font-style:normal;color:#5b46df}.card-crest{position:absolute;z-index:2;width:82px;height:82px;right:18px;bottom:12px;object-fit:contain;filter:drop-shadow(0 12px 16px rgba(49,36,28,.28))}.card-progress{position:absolute;z-index:4;left:0;right:0;bottom:0;height:4px;background:rgba(255,255,255,.45)}.card-progress i{display:block;height:100%;background:#6352db}.card-body{padding:16px}.card-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.card-title-row h3{margin:0;font-size:15px;letter-spacing:-.03em;line-height:1.2}.card-title-row>b{font-size:10px;color:#5b46df}.card-body>p{height:32px;overflow:hidden;margin:7px 0 10px;color:#7b8494;font-size:9px;line-height:1.55}.concepts{display:flex;gap:4px;overflow:hidden;min-height:22px}.concepts span{white-space:nowrap;padding:4px 6px;border:1px solid #ebebf4;border-radius:5px;background:#f8f8fc;color:#667085;font-size:7px}.card-footer{position:relative;z-index:4;display:grid;grid-template-columns:auto auto 1fr auto;gap:11px;align-items:end;margin-top:14px;padding-top:12px;border-top:1px solid #f0f1f4}.card-footer div small,.card-footer div b{display:block}.card-footer div small{font-size:6px;letter-spacing:.08em;color:#98a2b3}.card-footer div b{margin-top:3px;font-size:9px}.card-footer .next{min-width:0}.card-footer .next b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card-footer button{position:relative;z-index:5;border:1px solid #dedaf9;border-radius:7px;background:#f7f5ff;color:#5546d7;padding:7px 9px;font-size:8px;font-weight:800;cursor:pointer}@media(max-width:1080px){.pack-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.continue-run{grid-template-columns:220px 1fr}.continue-progress{left:220px}}@media(max-width:720px){.library-page{width:calc(100% - 24px);padding-top:22px}.library-hero,.section-head{align-items:flex-start;flex-direction:column}.forge-main,.search{width:100%;max-width:none}.continue-run{grid-template-columns:1fr}.continue-art{height:160px}.continue-progress{left:0}.pack-grid{grid-template-columns:1fr}.hero-copy h1{font-size:36px}}
</style>
