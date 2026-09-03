<script>
  // @ts-nocheck
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
  $: visibleTools = webmcpTools.length ? webmcpTools : ['ingest_learning_material', 'explore_module', 'submit_solution', 'inspect_progress'];
  $: latest = activity?.find((item) => visibleTools.includes(item?.tool)) || activity?.[0] || null;

  function badgeIcon(item) {
    if (item.sourceKind === 'youtube') return '▶';
    if (item.sourceKind === 'upload') return '▤';
    if (item.sourceKind === 'url') return '↗';
    if (item.sourceKind === 'pasted-text') return '¶';
    return '✦';
  }
</script>

<main class="library-page">
  <section class="vault-intro">
    <div class="intro-copy">
      <span class="eyebrow">0x1 EXPEDITION VAULT</span>
      <h1>Learn through worlds,<br /><em>not worksheets.</em></h1>
      <p>Forge any source into a branching expedition, prove understanding under pressure, and resume exactly where you left off.</p>
    </div>
    <button class="forge-hero" on:click={onForge}>
      <span class="plus">＋</span>
      <div><small>NEW EXPEDITION</small><b>Forge from any source</b><p>YouTube · PDF · article · notes</p></div>
      <i>→</i>
    </button>
  </section>

  {#if active}
    <section class="featured-run">
      <div class="featured-map"></div>
      <div class="featured-shade"></div>
      <div class="featured-grid"></div>
      <img class="featured-crest" src="/assets/vault-crest.webp" alt="" />

      <div class="featured-copy">
        <div class="featured-meta"><span>LIVE RUN</span><b>{active.sourceLabel}</b></div>
        <h2>{active.title}</h2>
        <p>{active.goal}</p>
        <div class="featured-actions">
          <button class="resume" on:click={() => onOpen(active.id)}>{active.progress >= 100 ? 'Review completed run' : `Continue · ${active.currentRoomTitle}`} <span>→</span></button>
          <button class="ghost" on:click={onForge}>Forge another</button>
        </div>
      </div>

      <aside class="run-pulse">
        <div class="pulse-head"><span>RUN PULSE</span><b>{active.progress}%</b></div>
        <div class="pulse-line"><i style={`width:${active.progress}%`}></i></div>
        <div class="pulse-stats">
          <div><small>STAGES</small><strong>{active.stageCleared}/{active.stageCount}</strong></div>
          <div><small>BELIEF</small><strong>{active.belief}%</strong></div>
          <div class="next"><small>NEXT</small><strong>{active.currentRoomTitle}</strong></div>
        </div>
      </aside>

      <button class:webmcp-live={webmcpNative} class="webmcp-ribbon" on:click={onAgent}>
        <span class="wmcp-mark">W<i></i></span>
        <span class="wmcp-copy"><small>WEBMCP CO-PILOT</small><b>{webmcpNative ? `${visibleTools.length} native tools live` : '4 browser-native tools ready'}</b></span>
        <span class="wmcp-tools">{#each visibleTools.slice(0, 4) as tool}<code>{tool.replaceAll('_', ' ')}</code>{/each}</span>
        <span class="wmcp-latest"><small>LATEST</small><b>{latest?.tool ? latest.tool.replaceAll('_', ' ') : 'shared state ready'}</b></span>
        <i class="arrow">→</i>
      </button>
    </section>
  {/if}

  <section class="library-section">
    <header class="section-head">
      <div><span>KNOWLEDGE PACKS</span><h2>Your worlds</h2><p>{packs.length} {packs.length === 1 ? 'expedition' : 'expeditions'} saved in this browser</p></div>
      <label class="search"><span>⌕</span><input bind:value={query} placeholder="Search packs or concepts…" /></label>
    </header>

    <div class="gallery">
      <button class="create-world" on:click={onForge}>
        <div class="create-orb"><span>＋</span></div>
        <small>CREATE NEW WORLD</small>
        <h3>Turn something you care about into a run.</h3>
        <p>Lecture, paper, URL, notes, PDF, or just a topic.</p>
        <b>Open Forge <span>→</span></b>
      </button>

      {#each filtered as item}
        <article class:active={item.id === activePackId} class="world-card">
          <button class="card-click" on:click={() => onOpen(item.id)} aria-label={`Open ${item.title}`}></button>
          <div class="world-art"><div class="map"></div><div class="shade"></div><span class="source"><i>{badgeIcon(item)}</i>{item.sourceLabel}</span><img src={item.isBossComplete ? '/assets/boss.webp' : '/assets/vault-crest.webp'} alt="" /></div>
          <div class="world-copy">
            <div class="world-title"><h3>{item.title}</h3><b>{item.progress}%</b></div>
            <p>{item.goal}</p>
            {#if (item.concepts || []).length}<div class="concepts">{#each item.concepts.slice(0, 3) as concept}<span>{concept}</span>{/each}</div>{/if}
            <footer><span><small>RUN</small><b>{item.stageCleared}/{item.stageCount}</b></span><span><small>BELIEF</small><b>{item.belief}%</b></span><span class="next"><small>NEXT</small><b>{item.currentRoomTitle}</b></span><button on:click={() => onOpen(item.id)}>{item.progress >= 100 ? 'Review' : item.progress ? 'Continue' : 'Start'} →</button></footer>
          </div>
        </article>
      {/each}
    </div>
  </section>
</main>

<style>
  .library-page{width:min(1460px,calc(100% - 48px));margin:0 auto;padding:42px 0 90px;font-family:Inter,system-ui,sans-serif;color:#111827}.vault-intro{display:grid;grid-template-columns:minmax(0,1fr) 360px;align-items:end;gap:42px;margin-bottom:28px}.eyebrow,.section-head>div>span{font-size:9px;letter-spacing:.16em;color:#5b46df;font-weight:850}.intro-copy h1{margin:10px 0 13px;font-size:clamp(44px,5vw,68px);line-height:.94;letter-spacing:-.064em;font-weight:820}.intro-copy h1 em{font-style:normal;background:linear-gradient(90deg,#5846df,#8674ee 56%,#168c72);-webkit-background-clip:text;background-clip:text;color:transparent}.intro-copy p{margin:0;max-width:760px;font-size:14px;line-height:1.65;color:#687386}.forge-hero{position:relative;display:grid;grid-template-columns:54px 1fr auto;align-items:center;gap:14px;padding:18px 18px;border:0;border-radius:18px;background:linear-gradient(135deg,#6653e7 0%,#5546d7 52%,#3929b9 100%);color:#fff;box-shadow:0 20px 44px rgba(79,70,229,.22),inset 0 1px 0 rgba(255,255,255,.18);cursor:pointer;text-align:left;overflow:hidden}.forge-hero:after{content:'';position:absolute;width:170px;height:170px;right:-60px;bottom:-105px;border:1px solid rgba(255,255,255,.18);border-radius:40px;transform:rotate(35deg)}.forge-hero .plus{width:52px;height:52px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.22);border-radius:14px;background:rgba(255,255,255,.14);font-size:27px}.forge-hero small,.forge-hero b,.forge-hero p{display:block}.forge-hero small{font-size:7px;letter-spacing:.12em;color:#cbc5ff;font-weight:850}.forge-hero b{margin-top:4px;font-size:14px}.forge-hero p{margin:3px 0 0;font-size:8px;color:#e5e0ff}.forge-hero>i{font-size:22px;font-style:normal;position:relative;z-index:1}
  .featured-run{position:relative;min-height:430px;border-radius:28px;overflow:hidden;margin-bottom:34px;box-shadow:0 28px 70px rgba(37,31,67,.2);isolation:isolate}.featured-map{position:absolute;inset:0;background:url('/assets/expedition-map.webp') center/cover no-repeat;transform:scale(1.02)}.featured-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(18,15,36,.9) 0%,rgba(28,23,55,.68) 45%,rgba(28,23,55,.18) 73%,rgba(22,18,44,.48) 100%)}.featured-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:44px 44px;mask-image:linear-gradient(90deg,#000,transparent 75%)}.featured-crest{position:absolute;z-index:1;right:29%;top:46%;width:132px;height:132px;object-fit:contain;transform:translateY(-50%);filter:drop-shadow(0 26px 34px rgba(59,39,142,.42));opacity:.96}.featured-copy{position:absolute;z-index:2;left:46px;top:48px;width:min(650px,55%);color:#fff}.featured-meta{display:flex;align-items:center;gap:10px}.featured-meta span{padding:6px 9px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(255,255,255,.1);font-size:8px;letter-spacing:.12em;font-weight:850}.featured-meta b{font-size:8px;color:#c8c2e3}.featured-copy h2{margin:15px 0 11px;font-size:clamp(34px,4vw,54px);line-height:.98;letter-spacing:-.055em}.featured-copy>p{margin:0;max-width:650px;color:#d3cfdf;font-size:12px;line-height:1.6}.featured-actions{display:flex;gap:9px;margin-top:25px}.featured-actions button{border-radius:11px;padding:12px 15px;font-size:10px;font-weight:800;cursor:pointer}.resume{border:0;background:#fff;color:#332796;box-shadow:0 10px 30px rgba(0,0,0,.18)}.resume span{margin-left:6px}.ghost{border:1px solid rgba(255,255,255,.2);background:rgba(11,9,22,.25);color:#fff;backdrop-filter:blur(10px)}.run-pulse{position:absolute;z-index:2;right:34px;top:34px;width:310px;padding:18px;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:rgba(15,12,29,.55);color:#fff;backdrop-filter:blur(18px);box-shadow:0 18px 44px rgba(0,0,0,.15)}.pulse-head{display:flex;align-items:flex-end;justify-content:space-between}.pulse-head span{font-size:8px;letter-spacing:.12em;color:#aaa3c6;font-weight:850}.pulse-head b{font-size:26px;line-height:1}.pulse-line{height:5px;margin:12px 0 15px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.pulse-line i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#8171f1,#a092ff,#47cba6)}.pulse-stats{display:grid;grid-template-columns:70px 70px 1fr;gap:8px}.pulse-stats div{padding:9px;border:1px solid rgba(255,255,255,.12);border-radius:9px;background:rgba(255,255,255,.06);min-width:0}.pulse-stats small,.pulse-stats strong{display:block}.pulse-stats small{font-size:6px;letter-spacing:.1em;color:#9f99b8}.pulse-stats strong{margin-top:4px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.webmcp-ribbon{position:absolute;z-index:3;left:22px;right:22px;bottom:20px;display:grid;grid-template-columns:auto auto 1fr auto auto;align-items:center;gap:13px;padding:10px 12px;border:1px solid rgba(255,255,255,.18);border-radius:15px;background:rgba(11,9,22,.7);color:#fff;backdrop-filter:blur(18px);cursor:pointer;text-align:left}.wmcp-mark{position:relative;width:36px;height:36px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(126,111,235,.18);font-weight:900;color:#c9c2ff}.wmcp-mark i{position:absolute;right:-2px;bottom:-2px;width:9px;height:9px;border:2px solid #171228;border-radius:50%;background:#8b95a6}.webmcp-live .wmcp-mark i{background:#31b989}.wmcp-copy small,.wmcp-copy b,.wmcp-latest small,.wmcp-latest b{display:block}.wmcp-copy small,.wmcp-latest small{font-size:6px;letter-spacing:.11em;color:#8f89a6;font-weight:850}.wmcp-copy b{margin-top:2px;font-size:9px}.wmcp-tools{display:flex;justify-content:center;gap:5px;overflow:hidden}.wmcp-tools code{white-space:nowrap;padding:5px 7px;border:1px solid rgba(255,255,255,.1);border-radius:7px;background:rgba(255,255,255,.05);color:#b9b3ce;font:6px ui-monospace,monospace}.wmcp-latest{max-width:170px}.wmcp-latest b{margin-top:2px;font-size:8px;color:#bfb7ed;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.webmcp-ribbon .arrow{font-size:17px;font-style:normal}
  .library-section{margin-top:0}.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:16px}.section-head h2{font-size:28px;letter-spacing:-.04em;margin:5px 0 3px}.section-head p{margin:0;color:#98a2b3;font-size:10px}.search{width:min(330px,38vw);height:42px;display:flex;align-items:center;gap:8px;border:1px solid #e1e5ea;border-radius:11px;background:#fff;padding:0 12px;box-shadow:0 4px 14px rgba(15,23,42,.035)}.search span{color:#98a2b3}.search input{border:0;outline:0;width:100%;font-size:10px;color:#344054;background:transparent}.gallery{display:grid;grid-template-columns:300px repeat(2,minmax(0,1fr));gap:16px;align-items:stretch}.create-world{min-height:340px;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;padding:26px;border:0;border-radius:22px;background:linear-gradient(160deg,#4e3fd0,#725ee9 55%,#8b76f3);color:#fff;text-align:left;cursor:pointer;box-shadow:0 18px 40px rgba(79,70,229,.17);position:relative;overflow:hidden}.create-world:before{content:'';position:absolute;inset:-40% auto auto 35%;width:260px;height:260px;border:1px solid rgba(255,255,255,.16);border-radius:55px;transform:rotate(28deg)}.create-orb{width:54px;height:54px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.22);border-radius:15px;background:rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}.create-orb span{font-size:27px}.create-world>small{margin-top:26px;font-size:7px;letter-spacing:.13em;color:#d5d0ff;font-weight:850}.create-world h3{margin:7px 0 8px;font-size:23px;line-height:1.05;letter-spacing:-.04em}.create-world p{margin:0;color:#e5e0ff;font-size:9px;line-height:1.5}.create-world>b{margin-top:18px;font-size:9px}.create-world>b span{margin-left:6px}.world-card{position:relative;min-width:0;min-height:340px;border:1px solid #e1e5ea;border-radius:22px;background:#fff;overflow:hidden;box-shadow:0 14px 34px rgba(15,23,42,.065);transition:.18s}.world-card:hover{transform:translateY(-4px);box-shadow:0 24px 48px rgba(15,23,42,.1)}.world-card.active{border-color:#a79def;box-shadow:0 0 0 2px #f0edff,0 18px 38px rgba(79,70,229,.09)}.card-click{position:absolute;inset:0;z-index:2;border:0;background:transparent;cursor:pointer}.world-art{position:relative;height:178px;overflow:hidden;background:#e7dcc2}.world-art .map{position:absolute;inset:0;background:url('/assets/expedition-map.webp') center/cover no-repeat;filter:saturate(.96)}.world-art .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(22,18,44,.02),rgba(24,20,48,.32))}.world-art .source{position:absolute;z-index:3;left:14px;top:14px;padding:6px 8px;border:1px solid rgba(255,255,255,.75);border-radius:999px;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);color:#475467;font-size:7px;font-weight:800}.world-art .source i{margin-right:5px;font-style:normal;color:#5b46df}.world-art img{position:absolute;z-index:2;width:92px;height:92px;right:20px;bottom:14px;object-fit:contain;filter:drop-shadow(0 14px 18px rgba(42,33,82,.28))}.world-copy{padding:17px}.world-title{display:flex;justify-content:space-between;gap:12px}.world-title h3{margin:0;font-size:17px;line-height:1.15;letter-spacing:-.035em}.world-title>b{font-size:10px;color:#5b46df}.world-copy>p{height:36px;overflow:hidden;margin:7px 0 10px;color:#7b8494;font-size:9px;line-height:1.5}.concepts{display:flex;gap:5px;overflow:hidden}.concepts span{white-space:nowrap;padding:4px 6px;border:1px solid #ebeaf5;border-radius:6px;background:#faf9ff;color:#6658bd;font-size:7px}.world-copy footer{position:relative;z-index:4;display:grid;grid-template-columns:auto auto 1fr auto;gap:11px;align-items:end;margin-top:13px;padding-top:12px;border-top:1px solid #f0f1f4}.world-copy footer small,.world-copy footer b{display:block}.world-copy footer small{font-size:6px;letter-spacing:.09em;color:#a2aab7}.world-copy footer b{margin-top:3px;font-size:8px}.world-copy footer .next{min-width:0}.world-copy footer .next b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.world-copy footer button{position:relative;z-index:5;border:1px solid #ddd9f9;border-radius:8px;background:#f8f6ff;color:#5546d7;padding:7px 9px;font-size:8px;font-weight:800;cursor:pointer}
  @media(max-width:1120px){.vault-intro{grid-template-columns:1fr}.forge-hero{width:min(420px,100%)}.run-pulse{width:270px}.featured-copy{width:58%}.gallery{grid-template-columns:280px 1fr}.gallery .world-card{grid-column:2}.wmcp-tools{display:none}.webmcp-ribbon{grid-template-columns:auto auto 1fr auto}.wmcp-latest{justify-self:end}}
  @media(max-width:760px){.library-page{width:calc(100% - 24px);padding-top:28px}.intro-copy h1{font-size:45px}.featured-run{min-height:570px}.featured-copy{left:24px;top:30px;width:calc(100% - 48px)}.run-pulse{left:24px;right:24px;top:auto;bottom:92px;width:auto}.webmcp-ribbon{left:12px;right:12px;bottom:12px}.wmcp-latest{display:none}.featured-copy h2{font-size:38px}.gallery{grid-template-columns:1fr}.gallery .world-card{grid-column:auto}.create-world{min-height:280px}.section-head{align-items:flex-start;flex-direction:column}.search{width:100%;max-width:none}}
</style>