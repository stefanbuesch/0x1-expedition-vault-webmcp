<script>
  // @ts-nocheck
  export let packs = [];
  export let activePackId = '';
  export let webmcpNative = false;
  export let webmcpTools = [];
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
  $: visibleTools = webmcpTools.length ? webmcpTools : ['ingest_learning_material', 'explore_module', 'submit_solution', 'inspect_progress'];

  function badgeIcon(item) {
    if (item.sourceKind === 'youtube') return '▶';
    if (item.sourceKind === 'upload') return '▤';
    if (item.sourceKind === 'url') return '↗';
    if (item.sourceKind === 'pasted-text') return '¶';
    return '✦';
  }
</script>

<main class="library-page">
  <section class="library-heading">
    <div>
      <span>KNOWLEDGE PACKS</span>
      <h1>Your Expedition Vault</h1>
      <p>Resume a learning world, inspect its curriculum, or forge a new expedition from any source.</p>
    </div>
    <button class="forge-main" on:click={onForge}><i>＋</i><span><b>Forge a new pack</b><small>YouTube · PDF · article · notes</small></span><em>→</em></button>
  </section>

  {#if active}
    <section class="current-card">
      <div class="current-art">
        <div class="map"></div>
        <div class="shade"></div>
        <span class="current-pill">CURRENT RUN</span>
        <img src="/assets/vault-crest.webp" alt="" />
      </div>
      <div class="current-copy">
        <div class="current-meta"><span>ACTIVE EXPEDITION</span><b>{active.sourceLabel}</b></div>
        <h2>{active.title}</h2>
        <p>{active.goal}</p>
        <div class="current-stats">
          <div><small>STAGE</small><b>{active.stageCleared}/{active.stageCount}</b><span>Progression</span></div>
          <div><small>MASTERY</small><b>{active.belief}%</b><span>Belief score</span></div>
          <div><small>ROOMS</small><b>{active.roomsCleared}/{active.roomCount}</b><span>Mastered</span></div>
          <div><small>NEXT UP</small><b>{active.currentRoomTitle}</b><span>{active.progress}% complete</span></div>
        </div>
        <div class="current-actions">
          <button class="primary" on:click={() => onOpen(active.id)}>{active.progress >= 100 ? 'Review expedition' : 'Resume expedition'} →</button>
          <button class="secondary" on:click={onAgent}><span class:webmcp-live={webmcpNative}></span>WebMCP · {visibleTools.length} tools</button>
        </div>
      </div>
      <aside class="current-progress">
        <div class="progress-ring" style={`--p:${active.progress * 3.6}deg`}><span><b>{active.progress}%</b><small>Run</small></span></div>
        <div><small>NEXT ENCOUNTER</small><strong>{active.currentRoomTitle}</strong><span>{active.belief}% belief</span></div>
      </aside>
    </section>
  {/if}

  <section class="packs-section">
    <header>
      <div><span>ALL EXPEDITIONS</span><h2>Knowledge Packs</h2><p>{packs.length} {packs.length === 1 ? 'pack' : 'packs'} saved in this browser</p></div>
      <label class="search"><span>⌕</span><input bind:value={query} placeholder="Search packs or concepts…" /></label>
    </header>

    <div class="pack-grid">
      <button class="new-pack" on:click={onForge}>
        <i>＋</i>
        <span>CREATE KNOWLEDGE PACK</span>
        <h3>Forge a new expedition</h3>
        <p>Paste a URL, upload a document, or start from a topic.</p>
        <b>Open Forge →</b>
      </button>

      {#each filtered as item}
        <article class:active={item.id === activePackId} class="pack-card">
          <button class="card-click" on:click={() => onOpen(item.id)} aria-label={`Open ${item.title}`}></button>
          <div class="card-art">
            <div class="map"></div><div class="shade"></div>
            <span class="source"><i>{badgeIcon(item)}</i>{item.sourceLabel}</span>
            <img src={item.isBossComplete ? '/assets/boss.webp' : '/assets/vault-crest.webp'} alt="" loading="lazy" decoding="async" />
            <span class="progress-label">{item.progress}%</span>
            <div class="progress-line"><i style={`width:${item.progress}%`}></i></div>
          </div>
          <div class="card-body">
            <h3>{item.title}</h3>
            <p>{item.goal}</p>
            <div class="card-meta"><span>{item.stageCleared}/{item.stageCount} stages</span><span>{item.belief}% mastery</span></div>
            <footer><span><small>NEXT</small><b>{item.currentRoomTitle}</b></span><button on:click={() => onOpen(item.id)}>{item.progress >= 100 ? 'Review' : item.progress ? 'Continue' : 'Start'} →</button></footer>
          </div>
        </article>
      {/each}
    </div>
  </section>
</main>

<style>
  .library-page{width:min(1420px,calc(100% - 44px));margin:0 auto;padding:30px 0 70px;font-family:Inter,system-ui,sans-serif;color:#151b2b}.library-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;margin-bottom:18px}.library-heading>div>span,.packs-section header>div>span{font-size:12px;font-weight:850;letter-spacing:.14em;color:#5b46df}.library-heading h1{margin:6px 0 6px;font-size:34px;line-height:1.05;letter-spacing:-.045em}.library-heading p{margin:0;color:#697386;font-size:14px;line-height:1.55}.forge-main{display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:11px;min-width:250px;padding:10px 12px;border:1px solid #dcd7fb;border-radius:11px;background:linear-gradient(135deg,#6755e7,#513dce);color:#fff;box-shadow:0 10px 24px rgba(79,70,229,.18);cursor:pointer;text-align:left}.forge-main>i{width:36px;height:36px;display:grid;place-items:center;border-radius:9px;background:rgba(255,255,255,.14);font-style:normal;font-size:20px}.forge-main span b,.forge-main span small{display:block}.forge-main span b{font-size:13px}.forge-main span small{margin-top:2px;color:#ded9ff;font-size:12px}.forge-main>em{font-size:17px;font-style:normal}
  .current-card{display:grid;grid-template-columns:310px minmax(0,1fr) 210px;min-height:218px;overflow:hidden;border:1px solid #dfe3ea;border-radius:15px;background:#fff;box-shadow:0 14px 34px rgba(15,23,42,.07);margin-bottom:26px}.current-art{position:relative;overflow:hidden;background:#e5d8ba}.map{position:absolute;inset:0;background:var(--map-image) center/cover no-repeat}.shade{position:absolute;inset:0;background:linear-gradient(145deg,rgba(35,28,65,.06),rgba(78,62,166,.3))}.current-art img{position:absolute;width:108px;height:108px;left:50%;top:52%;transform:translate(-50%,-50%);object-fit:contain;filter:drop-shadow(0 16px 22px rgba(50,37,105,.3))}.current-pill{position:absolute;z-index:3;left:14px;top:14px;padding:5px 8px;border:1px solid rgba(255,255,255,.75);border-radius:999px;background:rgba(255,255,255,.9);font-size:12px;font-weight:850;color:#5145cd}.current-copy{padding:24px 25px;display:flex;flex-direction:column;justify-content:center}.current-meta{display:flex;align-items:center;gap:8px}.current-meta span{font-size:12px;font-weight:850;letter-spacing:.12em;color:#5b46df}.current-meta b{font-size:12px;color:#8c95a4}.current-copy h2{margin:6px 0 5px;font-size:24px;letter-spacing:-.04em}.current-copy>p{margin:0;color:#727b8c;font-size:12px;line-height:1.5;max-width:720px}.current-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:14px}.current-stats>div{min-width:0;padding:8px 9px;border:1px solid #e7eaf0;border-radius:8px;background:#fafbfc}.current-stats small,.current-stats b,.current-stats span{display:block}.current-stats small{font-size:12px;letter-spacing:.09em;color:#9aa3b1}.current-stats b{margin-top:3px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.current-stats span{margin-top:2px;font-size:12px;color:#98a2b3}.current-actions{display:flex;gap:8px;margin-top:13px}.current-actions button{border-radius:8px;padding:9px 11px;font-size:12px;font-weight:800;cursor:pointer}.current-actions .primary{border:0;background:#5946dc;color:#fff;box-shadow:0 7px 16px rgba(79,70,229,.15)}.current-actions .secondary{display:flex;align-items:center;gap:6px;border:1px solid #e1e4e9;background:#fff;color:#5e6776}.current-actions .secondary span{width:6px;height:6px;border-radius:50%;background:#9da6b4}.current-actions .secondary span.webmcp-live{background:#19a875}.current-progress{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:18px;border-left:1px solid #edf0f3;background:#fbfbfe;text-align:center}.progress-ring{width:86px;height:86px;display:grid;place-items:center;border-radius:50%;background:conic-gradient(#5b46df var(--p),#ececf4 0);position:relative}.progress-ring:after{content:'';position:absolute;inset:8px;border-radius:50%;background:#fff}.progress-ring span{position:relative;z-index:1}.progress-ring b,.progress-ring small{display:block}.progress-ring b{font-size:19px}.progress-ring small{font-size:12px;color:#8b95a5}.current-progress>div:last-child small,.current-progress>div:last-child strong,.current-progress>div:last-child span{display:block}.current-progress>div:last-child small{font-size:12px;letter-spacing:.1em;color:#9aa3b1}.current-progress>div:last-child strong{margin-top:4px;font-size:14px}.current-progress>div:last-child span{margin-top:2px;font-size:12px;color:#8a93a3}
  .packs-section header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:12px}.packs-section h2{margin:4px 0 2px;font-size:21px;letter-spacing:-.035em}.packs-section header p{margin:0;color:#98a2b3;font-size:12px}.search{width:min(310px,38vw);height:38px;display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid #e0e4ea;border-radius:9px;background:#fff}.search span{color:#98a2b3}.search input{width:100%;border:0;outline:0;background:transparent;font-size:12px}.pack-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(275px,1fr));gap:14px}.new-pack,.pack-card{min-height:286px;border-radius:14px}.new-pack{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:22px;border:1.5px dashed #d5d9e4;background:linear-gradient(145deg,#fff,#f8f7ff);text-align:left;color:#344054;cursor:pointer}.new-pack>i{width:40px;height:40px;display:grid;place-items:center;border:1px solid #dedafb;border-radius:10px;background:#fff;color:#5b46df;font-size:20px;font-style:normal}.new-pack>span{margin-top:15px;font-size:12px;letter-spacing:.12em;color:#6d60d1;font-weight:850}.new-pack h3{margin:6px 0 6px;font-size:17px}.new-pack p{margin:0;max-width:250px;color:#7a8493;font-size:12px;line-height:1.5}.new-pack b{margin-top:18px;color:#5546d7;font-size:12px}.pack-card{position:relative;overflow:hidden;border:1px solid #e0e4e9;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.05);transition:.16s}.pack-card:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(15,23,42,.08)}.pack-card.active{border-color:#aca3ef;box-shadow:0 0 0 2px #f1efff,0 12px 26px rgba(79,70,229,.07)}.card-click{position:absolute;z-index:2;inset:0;border:0;background:transparent;cursor:pointer}.card-art{height:130px;position:relative;overflow:hidden}.card-art .source{position:absolute;z-index:4;left:10px;top:10px;padding:5px 7px;border-radius:999px;background:rgba(255,255,255,.92);font-size:12px;font-weight:800;color:#4e596a}.card-art .source i{margin-right:4px;font-style:normal;color:#5b46df}.card-art img{position:absolute;z-index:3;width:72px;height:72px;right:14px;bottom:8px;object-fit:contain;filter:drop-shadow(0 10px 14px rgba(45,34,94,.26))}.progress-label{position:absolute;z-index:4;right:10px;top:10px;padding:4px 6px;border-radius:999px;background:rgba(30,24,58,.72);color:#fff;font-size:12px;font-weight:800}.progress-line{position:absolute;z-index:4;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.7)}.progress-line i{display:block;height:100%;background:#5b46df}.card-body{padding:14px}.card-body h3{margin:0;font-size:14px;letter-spacing:-.025em}.card-body>p{height:30px;overflow:hidden;margin:6px 0 9px;color:#7b8494;font-size:12px;line-height:1.5}.card-meta{display:flex;gap:8px;color:#798292;font-size:12px}.card-meta span{padding-right:8px;border-right:1px solid #e8eaee}.card-meta span:last-child{border:0}.card-body footer{position:relative;z-index:4;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid #eef0f3}.card-body footer small,.card-body footer b{display:block}.card-body footer small{font-size:12px;letter-spacing:.08em;color:#9da6b3}.card-body footer b{margin-top:3px;font-size:12px;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card-body footer button{border:1px solid #ddd9f9;border-radius:7px;background:#f8f6ff;color:#5546d7;padding:7px 9px;font-size:12px;font-weight:800;cursor:pointer}
  @media(max-width:1000px){.current-card{grid-template-columns:240px 1fr}.current-progress{grid-column:1/-1;border-left:0;border-top:1px solid #edf0f3;flex-direction:row}.current-stats{grid-template-columns:1fr 1fr}.library-heading{align-items:flex-start;flex-direction:column}.forge-main{width:100%;max-width:380px}}@media(max-width:680px){.library-page{width:calc(100% - 24px)}.current-card{grid-template-columns:1fr}.current-art{height:160px}.current-copy{padding:18px}.current-stats{grid-template-columns:1fr 1fr}.packs-section header{align-items:flex-start;flex-direction:column}.search{width:100%;max-width:none}}
</style>
