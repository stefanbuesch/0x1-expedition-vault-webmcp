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
  export let onVault = () => {};
  export let onMap = () => {};
  $: time = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  $: runPercent = Math.round((Math.max(0, clearedCount) / Math.max(1, totalRooms)) * 100);
</script>

<header class="hud">
  <div class="nav-actions">
    <button class="vault" on:click={onVault}>◇ Vault</button>
    <button class="map" on:click={onMap}>← Map</button>
  </div>
  <div class="context"><small>{packTitle}{partProgress ? ` · checkpoint ${partProgress}` : ''}</small><strong>{roomTitle}</strong></div>
  <BeliefMeter value={belief} {threshold} delta={beliefDelta} />
  <div class="right">
    <span>{progress} rooms{partProgress ? ` · part ${partProgress}` : ''}</span>
    <b>{time}</b>
    <i><em></em> RUN LIVE</i>
  </div>
  <div class="run-progress" title={`${runPercent}% of expedition cleared`}>
    <div class="run-fill" style={`width:${runPercent}%`}></div>
    {#each Array(totalRooms) as _, index}
      <span class:done={index < clearedCount} style={`left:${totalRooms <= 1 ? 99 : 1 + (index / (totalRooms - 1)) * 98}%`}></span>
    {/each}
  </div>
</header>

<style>
  .hud{height:74px;display:grid;grid-template-columns:auto minmax(180px,1fr) minmax(280px,430px) auto;align-items:center;gap:22px;padding:0 22px;background:rgba(7,11,20,.97);border-bottom:1px solid rgba(148,163,184,.18);position:sticky;top:0;z-index:40;backdrop-filter:blur(18px);font-family:Inter,system-ui,sans-serif}.nav-actions{display:flex;align-items:center;gap:7px}.map,.vault{border:1px solid rgba(148,163,184,.22);background:#101827;color:#cbd5e1;border-radius:9px;padding:10px 12px;font:700 9px Inter,sans-serif;cursor:pointer;white-space:nowrap}.vault{background:#17152a;border-color:rgba(129,117,235,.3);color:#bbb4ff}.map:hover,.vault:hover{border-color:#8175eb;color:#fff}.context{display:flex;flex-direction:column;min-width:0}.context small{font-size:8px;color:#6f7c90;letter-spacing:.11em;text-transform:uppercase}.context strong{font-size:13px;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}.right{display:grid;grid-template-columns:auto auto;gap:3px 11px;text-align:right;align-items:center}.right span,.right i{font-size:8px;color:#718096;font-style:normal}.right b{font-size:14px;color:#f8fafc}.right i{grid-column:1/-1;color:#9ba8bb}.right em{display:inline-block;width:6px;height:6px;border-radius:50%;background:#31b989;margin-right:5px;box-shadow:0 0 10px rgba(49,185,137,.6)}.run-progress{position:absolute;left:0;right:0;bottom:4px;height:3px;background:#222b3a}.run-fill{height:100%;background:linear-gradient(90deg,#6254dd,#9488f4);box-shadow:0 0 12px rgba(126,111,235,.26);transition:width .3s ease}.run-progress>span{position:absolute;top:50%;width:8px;height:8px;transform:translate(-50%,-50%);border:1px solid #465166;border-radius:50%;background:#0b1020}.run-progress>span.done{border-color:#9186ef;background:#9186ef}@media(max-width:880px){.context{display:none}.hud{grid-template-columns:auto 1fr auto}}@media(max-width:600px){.hud{height:auto;padding:10px 12px;gap:10px}.right{display:none}}
</style>
