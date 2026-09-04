<script>
  // @ts-nocheck
  export let value = 64;
  export let threshold = 45;
  export let delta = 0;
  $: danger = value < threshold;
</script>

<div class:danger class="meter" role="meter" aria-valuenow={value} aria-valuemin="0" aria-valuemax="100">
  <div class="label"><span>BELIEF</span><b>{Math.round(value)}%</b></div>
  <div class="track">
    <span class="fill" style={`width:${Math.max(0, Math.min(100, value))}%`}></span>
    <i style={`left:${threshold}%`}><small>{threshold}</small></i>
  </div>
  {#if delta}<div class:up={delta > 0} class="delta">{delta > 0 ? '+' : ''}{delta}</div>{/if}
</div>

<style>
  .meter{position:relative;min-width:260px}.label{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-bottom:6px}.label span{font:800 12px Inter,sans-serif;letter-spacing:.14em;color:#718096}.label b{font:800 15px Inter,sans-serif;color:#f8fafc}.track{height:7px;position:relative;border-radius:999px;background:#273244;overflow:visible}.fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#c8455f,#d6a33a 42%,#8074ed);box-shadow:0 0 15px rgba(128,116,237,.24);transition:width .25s ease}.track i{position:absolute;top:-4px;width:1px;height:15px;background:#cbd5e1;opacity:.7}.track i small{position:absolute;top:16px;left:-8px;font:700 12px Inter,sans-serif;color:#5f6d80}.delta{position:absolute;right:0;top:27px;font:800 12px Inter,sans-serif;color:#e36a7d}.delta.up{color:#4fc796}.danger .label b{color:#f27889}.danger .fill{filter:saturate(1.25)}
</style>
