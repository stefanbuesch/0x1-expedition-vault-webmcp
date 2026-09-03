<script>
  // @ts-nocheck
  export let native = false;
  export let tools = [];
  export let activity = [];
</script>

<aside class="rail" aria-label="Agent activity">
  <div class="head">
    <div><span class="kicker">WEBMCP / LIVE SURFACE</span><h2>Agent activity</h2></div>
    <span class:native class="status">{native ? 'NATIVE' : 'UI FALLBACK'}</span>
  </div>

  <div class="tools">
    <span>EXPOSED NOW</span>
    {#each tools as tool}<code>{tool}</code>{/each}
    {#if !tools.length}<em>detecting page context…</em>{/if}
  </div>

  <ol>
    {#each activity as item}
      <li>
        <span class={`dot ${item.kind}`}></span>
        <div><code>{item.tool}</code><p>{item.result}</p><small>{item.args}</small></div>
      </li>
    {:else}
      <li class="empty">No calls yet. The agent and learner operate on this same visible state.</li>
    {/each}
  </ol>
</aside>

<style>
  .rail{border:1px solid var(--line);background:#090c0b;min-height:100%;padding:18px}.head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.kicker,.tools>span{font-size:9px;letter-spacing:.14em;color:#617068}.head h2{margin:6px 0 0;font-size:16px;text-transform:uppercase}.status{border:1px solid #3d4943;padding:5px 7px;font-size:8px;color:#77827d}.status.native{border-color:#177b4d;color:var(--acid)}.tools{display:flex;flex-wrap:wrap;gap:6px;margin:18px 0;padding:13px 0;border-block:1px solid #202724}.tools>span{width:100%}.tools code{padding:4px 6px;background:#101713;color:#85a293;font-size:8px}.tools em{font-size:9px;color:#56605b;font-style:normal}ol{list-style:none;margin:0;padding:0}li{display:grid;grid-template-columns:8px 1fr;gap:10px;padding:11px 0;border-bottom:1px solid #171d1a}.dot{width:6px;height:6px;margin-top:5px;background:#607068}.dot.state{background:var(--acid)}.dot.approval{background:#ffcb4b}.dot.read{background:#65a7ff}li code{font-size:9px;color:#b8cbc1}li p{margin:4px 0;color:#829087;font-size:10px;line-height:1.4}li small{color:#4f5b55;font-size:8px}.empty{display:block;color:#54615a;font-size:10px;line-height:1.5}
</style>
