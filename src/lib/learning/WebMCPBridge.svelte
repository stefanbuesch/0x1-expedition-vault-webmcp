<script>
  // @ts-nocheck
  export let native = false;
  export let tools = [];
  export let activity = [];
  export let compact = false;
  export let stateLabel = 'Shared expedition state';
  export let stateDetail = 'Human and browser agent mutate the same run.';
  export let onOpen = () => {};

  $: visibleTools = tools.length ? tools : ['ingest_learning_material', 'explore_module', 'submit_solution', 'inspect_progress'];
  $: latest = activity?.find((item) => visibleTools.includes(item?.tool)) || activity?.[0] || null;
</script>

<section class:compact class:native class="bridge">
  <div class="pulse-line"></div>
  <div class="bridge-head">
    <div class="webmcp-mark"><span>W</span><i></i></div>
    <div class="bridge-title">
      <span>WEBMCP // MODEL CONTEXT BRIDGE</span>
      <h2>{native ? 'Browser agent connected to the expedition.' : 'Agent-native expedition ready.'}</h2>
      <p>{native ? 'Tools are registered on document.modelContext and operate on the same state the learner sees.' : 'When the browser exposes document.modelContext, these tools register natively without a second backend state.'}</p>
    </div>
    <button class="console" on:click={onOpen}>Open WebMCP Console →</button>
  </div>

  <div class="flow" aria-label="WebMCP shared-state flow">
    <div class="flow-node agent-node">
      <span>BROWSER AGENT</span>
      <b>Model-aware co-pilot</b>
      <small>Discovers tools from this page</small>
    </div>
    <div class="connector"><i></i><b>document.modelContext</b><i></i></div>
    <div class="flow-node state-node">
      <span>ONE LIVE STATE</span>
      <b>{stateLabel}</b>
      <small>{stateDetail}</small>
    </div>
    <div class="connector reverse"><i></i><b>same mutations</b><i></i></div>
    <div class="flow-node human-node">
      <span>HUMAN UI</span>
      <b>Map · room · mastery</b>
      <small>Immediately reflects agent actions</small>
    </div>
  </div>

  <div class="bridge-bottom">
    <div class="tool-row">
      <span class="label">{native ? 'REGISTERED NOW' : 'WEBMCP TOOL SURFACE'}</span>
      {#each visibleTools as tool}
        <code class:registered={native || tools.includes(tool)}><i></i>{tool}</code>
      {/each}
    </div>
    <div class="activity-row">
      <span class="label">LATEST SHARED MUTATION</span>
      {#if latest}
        <b>{latest.tool}</b><small>{latest.result}</small>
      {:else}
        <b>Waiting for first agent call</b><small>Invoke a WebMCP tool and this surface updates from the same run log.</small>
      {/if}
    </div>
  </div>
</section>

<style>
  .bridge{position:relative;overflow:hidden;border:1px solid #272d45;border-radius:18px;background:linear-gradient(135deg,#0a0f1c 0%,#10162a 52%,#0b1221 100%);color:#f8fafc;box-shadow:0 18px 48px rgba(16,24,40,.16);font-family:Inter,system-ui,sans-serif}.bridge.native{border-color:#21634f;box-shadow:0 18px 48px rgba(15,118,82,.12)}.pulse-line{position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,#6755df,#8b7bf4 45%,#19b985 70%,#6755df);background-size:180% 100%;animation:flow 3.4s linear infinite}.bridge-head{display:grid;grid-template-columns:auto 1fr auto;gap:15px;align-items:center;padding:18px 20px 14px}.webmcp-mark{position:relative;width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(151,139,255,.35);border-radius:12px;background:linear-gradient(145deg,rgba(104,85,223,.32),rgba(31,42,70,.4));box-shadow:inset 0 0 22px rgba(105,86,224,.12)}.webmcp-mark span{font-size:16px;font-weight:900;color:#c8c1ff}.webmcp-mark i{position:absolute;right:-3px;bottom:-3px;width:10px;height:10px;border:2px solid #10162a;border-radius:50%;background:#8290a8}.native .webmcp-mark i{background:#22c58b;box-shadow:0 0 12px rgba(34,197,139,.7)}.bridge-title>span{font-size:7px;letter-spacing:.15em;color:#8f84e9;font-weight:850}.bridge-title h2{margin:4px 0 3px;font-size:17px;letter-spacing:-.03em}.bridge-title p{margin:0;max-width:760px;color:#8997ab;font-size:8px;line-height:1.5}.console{border:1px solid rgba(145,134,239,.32);border-radius:9px;background:#171d34;color:#c8c1ff;padding:9px 11px;font-size:8px;font-weight:800;cursor:pointer}.console:hover{border-color:#978cf2;color:#fff}.flow{display:grid;grid-template-columns:1fr auto 1.2fr auto 1fr;align-items:center;gap:7px;padding:11px 20px;border-block:1px solid rgba(148,163,184,.12);background:rgba(3,7,15,.34)}.flow-node{min-width:0;padding:10px 11px;border:1px solid rgba(148,163,184,.13);border-radius:9px;background:rgba(15,23,42,.5)}.flow-node span,.flow-node b,.flow-node small{display:block}.flow-node span{font-size:6px;letter-spacing:.12em;color:#66748a;font-weight:850}.flow-node b{margin-top:4px;font-size:9px;color:#e7ebf2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.flow-node small{margin-top:3px;font-size:7px;color:#738096}.state-node{border-color:rgba(145,134,239,.28);background:rgba(97,84,221,.08)}.native .state-node{border-color:rgba(34,197,139,.25);background:rgba(17,120,84,.08)}.connector{display:flex;align-items:center;gap:4px;min-width:90px}.connector i{height:1px;flex:1;background:linear-gradient(90deg,#5148a9,#8a7ff1)}.connector i:last-child{position:relative}.connector i:last-child:after{content:'';position:absolute;right:0;top:-2px;border-left:5px solid #8a7ff1;border-block:2.5px solid transparent}.connector b{font:6px ui-monospace,monospace;color:#7268c9;white-space:nowrap}.connector.reverse i{background:linear-gradient(90deg,#1e7d63,#28bc8d)}.connector.reverse i:last-child:after{border-left-color:#28bc8d}.connector.reverse b{color:#55b99b}.bridge-bottom{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(250px,.75fr);gap:16px;padding:12px 20px 14px}.label{display:block;font-size:6px;letter-spacing:.12em;color:#5f6b7d;font-weight:850}.tool-row{display:flex;align-items:center;flex-wrap:wrap;gap:5px}.tool-row .label{width:100%;margin-bottom:2px}.tool-row code{display:flex;align-items:center;gap:5px;padding:5px 7px;border:1px solid rgba(148,163,184,.13);border-radius:6px;background:#0b1120;color:#8e99aa;font:7px ui-monospace,monospace}.tool-row code i{width:5px;height:5px;border-radius:50%;background:#677386}.tool-row code.registered{border-color:rgba(34,197,139,.22);color:#96dec7;background:rgba(13,80,61,.13)}.tool-row code.registered i{background:#22c58b;box-shadow:0 0 8px rgba(34,197,139,.5)}.activity-row{min-width:0;border-left:1px solid rgba(148,163,184,.12);padding-left:16px}.activity-row b,.activity-row small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.activity-row b{margin-top:4px;color:#bcb4ff;font:8px ui-monospace,monospace}.activity-row small{margin-top:3px;color:#738096;font-size:7px}.bridge.compact .flow{display:none}.bridge.compact .bridge-head{padding-bottom:11px}.bridge.compact .bridge-bottom{padding-top:10px}.bridge.compact .bridge-title h2{font-size:14px}@keyframes flow{to{background-position:-180% 0}}@media(max-width:900px){.flow{grid-template-columns:1fr}.connector{display:none}.bridge-bottom{grid-template-columns:1fr}.activity-row{border-left:0;border-top:1px solid rgba(148,163,184,.12);padding:9px 0 0}.bridge-head{grid-template-columns:auto 1fr}.console{grid-column:1/-1;width:100%}}@media(max-width:600px){.bridge-head,.flow,.bridge-bottom{padding-inline:13px}.bridge-title p{display:none}}
</style>
