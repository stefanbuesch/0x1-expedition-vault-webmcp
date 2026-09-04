<script>
  // @ts-nocheck
  import BeliefMeter from './BeliefMeter.svelte';
  export let packTitle = '';
  export let roomTitle = '';
  export let progress = '';
  export let belief = 64;
  export let threshold = 45;
  export let beliefDelta = 0;
  export let elapsed = 0;
  export let clearedCount = 0;
  export let totalRooms = 1;
  export let partProgress = '';
  export let strikes = 0;
  export let maxStrikes = 3;
  export let runStatus = 'active';
  export let onVault = () => {};
  export let onMap = () => {};
  $: time = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  $: runPercent = Math.round((Math.max(0, clearedCount) / Math.max(1, totalRooms)) * 100);
</script>

<header class="hud">
  <div class="run-nav">
    <button class="vault-brand" on:click={onVault} aria-label="Return to Expedition Vault">
      <img src="/assets/vault-crest.webp" alt="" />
      <span><b>0x1 Vault</b><small>Expedition run</small></span>
    </button>
    <button class="map" on:click={onMap}>← Map</button>
  </div>

  <div class="context">
    <small>{packTitle}</small>
    <strong>{roomTitle}</strong>
    {#if partProgress}<em>Checkpoint {partProgress}</em>{/if}
  </div>

  <BeliefMeter value={belief} {threshold} delta={beliefDelta} />

  <div class="right">
    <div class="depth"><span>RUN DEPTH</span><b>{progress}</b><small>stages</small></div>
    <div class="strikes"><span>STRIKES</span><b>{strikes} / {maxStrikes}</b><small>{maxStrikes - strikes} remaining</small></div>
    <div class="clock"><span>ELAPSED</span><b>{time}</b><small>{runPercent}% clear</small></div>
    <i class:failed={runStatus === 'failed'}><em></em> {runStatus === 'failed' ? 'RUN FAILED' : 'RUN LIVE'}</i>
  </div>

  <div class="run-progress" title={`${runPercent}% of expedition cleared`}>
    <div class="run-fill" style={`width:${runPercent}%`}></div>
    {#each Array(totalRooms) as _, index}
      <span class:done={index < clearedCount} style={`left:${totalRooms <= 1 ? 99 : 1 + (index / (totalRooms - 1)) * 98}%`}></span>
    {/each}
  </div>
</header>

<style>
  .hud{height:74px;display:grid;grid-template-columns:220px minmax(190px,1fr) minmax(300px,410px) 190px;align-items:center;gap:20px;padding:0 22px;background:rgba(7,11,20,.975);border-bottom:1px solid rgba(148,163,184,.17);position:sticky;top:0;z-index:40;backdrop-filter:blur(20px);font-family:Inter,system-ui,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.16)}
  .run-nav{display:flex;align-items:center;gap:7px}.vault-brand{display:grid;grid-template-columns:30px 1fr;align-items:center;gap:8px;border:1px solid rgba(145,134,239,.22);background:#111628;color:#f8fafc;border-radius:10px;padding:6px 9px;cursor:pointer;text-align:left;min-width:134px}.vault-brand:hover,.map:hover{border-color:#8175eb;background:#17162a}.vault-brand img{width:28px;height:28px;object-fit:contain}.vault-brand span b,.vault-brand span small{display:block}.vault-brand span b{font-size:12px;letter-spacing:-.01em}.vault-brand span small{margin-top:1px;font-size:12px;color:#758196}.map{border:1px solid rgba(148,163,184,.2);background:#0f1726;color:#aeb8c8;border-radius:9px;padding:10px 11px;font:700 12px Inter,sans-serif;cursor:pointer;white-space:nowrap}
  .context{display:flex;flex-direction:column;min-width:0}.context small{font-size:12px;color:#69768a;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.context strong{margin-top:2px;font-size:13px;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.context em{margin-top:2px;color:#9086df;font-size:12px;font-style:normal;font-weight:750}
  .right{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 12px;align-items:end;text-align:right}.depth,.clock,.strikes{min-width:0}.depth span,.clock span,.strikes span,.depth small,.clock small,.strikes small{display:block}.depth span,.clock span,.strikes span{font-size:12px;letter-spacing:.1em;color:#657286;font-weight:800}.depth b,.clock b,.strikes b{display:inline-block;margin-top:2px;font-size:13px;color:#f8fafc}.depth small,.clock small,.strikes small{margin-top:1px;font-size:12px;color:#69768a}.right>i{grid-column:1/-1;color:#8e9aae;font-size:12px;font-style:normal}.right>i.failed{color:#ff9aaa}.right>i.failed em{background:#ef476f;box-shadow:0 0 10px rgba(239,71,111,.65)}.right>i em{display:inline-block;width:6px;height:6px;border-radius:50%;background:#31b989;margin-right:5px;box-shadow:0 0 10px rgba(49,185,137,.65)}
  .run-progress{position:absolute;left:0;right:0;bottom:3px;height:3px;background:#222b3a}.run-fill{height:100%;background:linear-gradient(90deg,#6254dd,#9488f4);box-shadow:0 0 12px rgba(126,111,235,.26);transition:width .3s ease}.run-progress>span{position:absolute;top:50%;width:8px;height:8px;transform:translate(-50%,-50%);border:1px solid #465166;border-radius:50%;background:#0b1020}.run-progress>span.done{border-color:#9186ef;background:#9186ef;box-shadow:0 0 0 2px rgba(145,134,239,.08)}
  @media(max-width:960px){.hud{grid-template-columns:auto 1fr minmax(240px,340px) auto}.vault-brand span{display:none}.vault-brand{min-width:auto;grid-template-columns:30px;padding:6px}.context{display:none}}
  @media(max-width:680px){.hud{height:auto;padding:9px 10px 12px;gap:9px;grid-template-columns:auto 1fr}.right{display:none}.hud :global(.meter){min-width:0}.run-nav{grid-column:1}.hud :global(.meter){grid-column:2}.map{padding-inline:9px}}
</style>
