<script>
  // @ts-nocheck
  export let native = false;
  export let tools = [];
  export let activity = [];
  let open = false;

  $: visibleTools = tools.length ? tools : ['ingest_learning_material', 'explore_module', 'submit_solution', 'inspect_progress'];
  $: latest = activity?.[0] || null;
  $: latestLabel = latest?.tool ? String(latest.tool).replaceAll('_', ' ') : 'No calls in this room yet';
</script>

<div class:open class="copilot">
  {#if open}
    <section class="panel" aria-label="WebMCP co-pilot">
      <header>
        <div class="identity"><img src="/assets/vault-crest.webp" alt="" /><div><span>WEBMCP CO-PILOT</span><b>{native ? 'document.modelContext live' : '4 tools ready'}</b></div></div>
        <button class="close" aria-label="Close WebMCP co-pilot" on:click={() => open = false}>×</button>
      </header>
      <p>The browser agent is in the same room, on the same checkpoint, under the same gates. Tool calls mutate this visible run.</p>
      <div class="latest">
        <span>LATEST ACTION</span>
        <b>{latestLabel}</b>
        {#if latest?.result}<small>{latest.result}</small>{:else}<small>Tool calls and outcomes appear here while the run is live.</small>{/if}
      </div>
      <div class="tools">
        {#each visibleTools as tool}<code>{tool}</code>{/each}
      </div>
    </section>
  {/if}
  <button class="trigger" aria-expanded={open} on:click={() => open = !open}>
    <img src="/assets/vault-crest.webp" alt="" />
    <span><b>WebMCP Co-Pilot</b><small>{native ? '4 native tools live' : 'document.modelContext ready'}</small></span>
    <i class:live={native}></i>
  </button>
</div>

<style>
  .copilot{position:fixed;z-index:80;right:22px;bottom:22px;width:296px;font-family:Inter,system-ui,sans-serif;color:#f8fafc}.trigger{width:100%;height:48px;display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:9px;padding:6px 10px;border:1px solid rgba(148,163,184,.22);border-radius:12px;background:rgba(10,15,27,.92);color:#f8fafc;box-shadow:0 14px 38px rgba(0,0,0,.28);backdrop-filter:blur(18px);cursor:pointer;text-align:left}.trigger:hover{border-color:#8175eb}.trigger img{width:30px;height:30px;object-fit:contain}.trigger span b,.trigger span small{display:block}.trigger span b{font-size:10px}.trigger span small{margin-top:2px;font-size:7px;color:#7f8ca0}.trigger i{width:8px;height:8px;border-radius:50%;background:#748096}.trigger i.live{background:#31b989;box-shadow:0 0 12px rgba(49,185,137,.62)}.panel{margin-bottom:8px;padding:14px;border:1px solid rgba(148,163,184,.22);border-radius:14px;background:linear-gradient(145deg,rgba(15,23,42,.97),rgba(9,14,25,.97));box-shadow:0 22px 60px rgba(0,0,0,.38);backdrop-filter:blur(20px)}.panel header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.identity{display:flex;gap:8px;align-items:center}.identity img{width:34px;height:34px;object-fit:contain}.identity span,.identity b{display:block}.identity span{font-size:7px;letter-spacing:.12em;color:#9186ef;font-weight:850}.identity b{margin-top:2px;font-size:10px}.close{border:0;background:transparent;color:#768297;font-size:18px;line-height:1;cursor:pointer}.panel>p{margin:10px 0 12px;color:#8d9aad;font-size:8px;line-height:1.55}.latest{padding:10px;border:1px solid rgba(148,163,184,.14);border-radius:9px;background:rgba(5,9,17,.52)}.latest span,.latest b,.latest small{display:block}.latest span{font-size:6px;letter-spacing:.12em;color:#6f7c90;font-weight:800}.latest b{margin-top:4px;font-size:9px;text-transform:capitalize}.latest small{margin-top:4px;color:#7f8ca0;font-size:7px;line-height:1.45}.tools{display:flex;flex-wrap:wrap;gap:4px;margin-top:10px}.tools code{padding:4px 5px;border:1px solid rgba(145,134,239,.14);border-radius:5px;background:rgba(97,84,223,.08);color:#aaa3eb;font:6px ui-monospace,monospace}@media(max-width:650px){.copilot{right:10px;bottom:10px;width:250px}.panel{display:none}.copilot.open .panel{display:block}}
</style>
