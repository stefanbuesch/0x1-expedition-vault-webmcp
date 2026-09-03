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
  <div class="bridge-head">
    <div class="webmcp-mark"><span>W</span><i></i></div>
    <div class="bridge-title">
      <span>WEBMCP · SHARED BROWSER STATE</span>
      <h2>{native ? 'Browser agent connected to this expedition' : 'WebMCP tool surface ready'}</h2>
      <p>{native ? 'Four tools are registered on document.modelContext and mutate the same state the learner sees.' : 'Open in a WebMCP-capable browser and the page registers four native tools against this exact run state.'}</p>
    </div>
    <button class="console" on:click={onOpen}>Open console <span>→</span></button>
  </div>

  <div class="flow" aria-label="WebMCP shared-state flow">
    <div class="flow-node">
      <span>BROWSER AGENT</span>
      <b>Discovers the page tools</b>
      <small>No DOM guessing required</small>
    </div>
    <div class="connector"><b>document.modelContext</b><i></i></div>
    <div class="flow-node state-node">
      <span>ONE LIVE STATE</span>
      <b>{stateLabel}</b>
      <small>{stateDetail}</small>
    </div>
    <div class="connector reverse"><b>same mutations</b><i></i></div>
    <div class="flow-node">
      <span>LEARNER UI</span>
      <b>Map · room · mastery</b>
      <small>Reflects agent actions immediately</small>
    </div>
  </div>

  <div class="bridge-bottom">
    <div class="tool-row">
      <span class="label">{native ? 'REGISTERED TOOLS' : 'AVAILABLE TOOLS'}</span>
      <div class="tools">
        {#each visibleTools as tool}
          <code class:registered={native || tools.includes(tool)}><i></i>{tool}</code>
        {/each}
      </div>
    </div>
    <div class="activity-row">
      <span class="label">LATEST SHARED MUTATION</span>
      {#if latest}
        <b>{latest.tool}</b><small>{latest.result}</small>
      {:else}
        <b>Waiting for first WebMCP call</b><small>Tool activity appears here from the same run log.</small>
      {/if}
    </div>
  </div>
</section>

<style>
  .bridge{position:relative;overflow:hidden;border:1px solid #e2e5eb;border-radius:16px;background:#fff;color:#111827;box-shadow:0 12px 34px rgba(15,23,42,.055);font-family:Inter,system-ui,sans-serif}.bridge:before{content:'';position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,#5b46df,#9d91f4 60%,#32b58c)}.bridge.native{border-color:#d8e8e1}.bridge-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;padding:18px 20px 15px}.webmcp-mark{position:relative;width:42px;height:42px;display:grid;place-items:center;border:1px solid #ddd8fb;border-radius:11px;background:linear-gradient(145deg,#f8f6ff,#eeebff);box-shadow:0 6px 16px rgba(79,70,229,.08)}.webmcp-mark span{font-size:15px;font-weight:900;color:#5749c7}.webmcp-mark i{position:absolute;right:-3px;bottom:-3px;width:10px;height:10px;border:2px solid #fff;border-radius:50%;background:#94a3b8}.native .webmcp-mark i{background:#18a875}.bridge-title{min-width:0}.bridge-title>span{font-size:7px;letter-spacing:.14em;color:#6c5ed6;font-weight:850}.bridge-title h2{margin:5px 0 3px;font-size:16px;line-height:1.2;letter-spacing:-.025em;color:#172033}.bridge-title p{margin:0;max-width:780px;color:#778196;font-size:8px;line-height:1.55}.console{display:flex;align-items:center;gap:8px;border:1px solid #dedaf7;border-radius:8px;background:#f8f6ff;color:#5145cd;padding:9px 11px;font-size:8px;font-weight:800;cursor:pointer}.console:hover{border-color:#aaa0ed;background:#f1eeff}.flow{display:grid;grid-template-columns:1fr auto 1.1fr auto 1fr;align-items:center;gap:10px;padding:13px 20px;border-block:1px solid #eef0f3;background:#fafbfc}.flow-node{min-width:0;padding:11px 12px;border:1px solid #e8eaf0;border-radius:9px;background:#fff}.flow-node span,.flow-node b,.flow-node small{display:block}.flow-node span{font-size:6px;letter-spacing:.12em;color:#98a2b3;font-weight:850}.flow-node b{margin-top:4px;font-size:9px;color:#283244;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.flow-node small{margin-top:3px;font-size:7px;color:#8b95a6}.state-node{border-color:#dcd6fb;background:#f8f6ff}.native .state-node{border-color:#d7e8e0;background:#f7fbf9}.connector{display:grid;grid-template-columns:auto 42px;align-items:center;gap:5px}.connector b{font:6px ui-monospace,SFMono-Regular,Menlo,monospace;color:#7569c9;white-space:nowrap}.connector i{height:1px;background:#afa6ec;position:relative}.connector i:after{content:'';position:absolute;right:0;top:-2px;border-left:5px solid #8e82e4;border-block:2.5px solid transparent}.connector.reverse b{color:#4f8f78}.connector.reverse i{background:#91cbb7}.connector.reverse i:after{border-left-color:#54a889}.bridge-bottom{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(260px,.75fr);gap:18px;padding:13px 20px 15px}.label{display:block;font-size:6px;letter-spacing:.12em;color:#98a2b3;font-weight:850}.tool-row{min-width:0}.tools{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:6px}.tools code{display:flex;align-items:center;gap:5px;padding:5px 7px;border:1px solid #e5e7ed;border-radius:6px;background:#fafbfc;color:#5d6677;font:7px ui-monospace,SFMono-Regular,Menlo,monospace}.tools code i{width:5px;height:5px;border-radius:50%;background:#9ca6b5}.tools code.registered{border-color:#d1e7dd;background:#f7fbf9;color:#26745b}.tools code.registered i{background:#16aa77}.activity-row{min-width:0;border-left:1px solid #eceef2;padding-left:18px}.activity-row b,.activity-row small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.activity-row b{margin-top:6px;color:#5145cd;font:8px ui-monospace,SFMono-Regular,Menlo,monospace}.activity-row small{margin-top:3px;color:#8791a1;font-size:7px}.bridge.compact .flow{display:none}.bridge.compact .bridge-head{padding-bottom:12px}.bridge.compact .bridge-bottom{padding-top:11px}.bridge.compact .bridge-title h2{font-size:14px}@media(max-width:900px){.flow{grid-template-columns:1fr}.connector{display:none}.bridge-bottom{grid-template-columns:1fr}.activity-row{border-left:0;border-top:1px solid #eceef2;padding:10px 0 0}.bridge-head{grid-template-columns:auto 1fr}.console{grid-column:1/-1;justify-content:center}}@media(max-width:600px){.bridge-head,.flow,.bridge-bottom{padding-inline:14px}.bridge-title p{display:none}}
</style>
