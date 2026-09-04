<script>
  // @ts-nocheck
  export let belief = 0;
  export let cleared = 0;
  export let onRestart = () => {};
  export let onContinue = () => {};
  export let onClose = () => {};
  export let hasAnnex = false;
</script>

<div class="backdrop" role="presentation" on:click={onClose}>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="Expedition complete" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
    <div class="victory-art">
      <img class="boss" src="/assets/boss.webp" alt="" />
      <img class="chest" src="/assets/reward-chest.webp" alt="" />
    </div>
    <div class="copy">
      <span class="kicker">BOSS CLEARED · EXTRACTION WINDOW</span>
      <h2>THE RUN HOLDS.</h2>
      <p>{hasAnnex ? 'You broke the systems gate with causal evidence. Extract, rerun the seed, or push into the optional annex.' : 'You completed the expedition path with causal evidence. Inspect the mastered map or rerun the seed against a different path.'}</p>
      <div class="stats">
        <div><strong>{belief}%</strong><span>FINAL BELIEF</span></div>
        <div><strong>{cleared}</strong><span>ROOMS CLEARED</span></div>
        <div><strong>LIVE</strong><span>AGENT CO-OP</span></div>
      </div>
      <div class="actions">
        <button on:click={onClose}>Inspect map</button>
        <button on:click={onRestart}>Restart run</button>
        <button class="primary" on:click={onContinue}>{hasAnnex ? 'Enter annex →' : 'View completed map →'}</button>
      </div>
    </div>
  </div>
</div>

<style>
  .backdrop{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:24px;background:rgba(4,7,13,.82);backdrop-filter:blur(18px);font-family:Inter,system-ui,sans-serif}.dialog{width:min(850px,96vw);display:grid;grid-template-columns:300px 1fr;overflow:hidden;border:1px solid rgba(148,163,184,.22);border-radius:22px;background:linear-gradient(145deg,#111827,#0b1020);box-shadow:0 40px 120px rgba(0,0,0,.55);color:#f8fafc}.victory-art{position:relative;min-height:430px;background:radial-gradient(circle at 50% 32%,rgba(155,79,227,.32),transparent 35%),linear-gradient(160deg,#160b22,#0b0d18);overflow:hidden}.victory-art:after{content:'';position:absolute;inset:0;background:var(--map-image) center/cover;opacity:.08;filter:hue-rotate(200deg)}.boss{position:absolute;z-index:2;width:250px;height:250px;object-fit:contain;left:24px;top:38px;filter:drop-shadow(0 22px 35px rgba(155,79,227,.34))}.chest{position:absolute;z-index:3;width:120px;height:120px;object-fit:contain;left:91px;bottom:22px;filter:drop-shadow(0 16px 24px rgba(0,0,0,.38))}.copy{padding:44px 40px;display:flex;flex-direction:column;justify-content:center}.kicker{font-size:9px;letter-spacing:.14em;color:#c17bff;font-weight:800}.copy h2{font-size:42px;line-height:.98;letter-spacing:-.055em;margin:10px 0 14px}.copy>p{margin:0;color:#9aa7b8;font-size:11px;line-height:1.7;max-width:430px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:26px 0}.stats div{padding:14px;border:1px solid rgba(148,163,184,.17);border-radius:10px;background:rgba(15,23,42,.64)}.stats strong,.stats span{display:block}.stats strong{font-size:20px}.stats span{margin-top:4px;font-size:7px;letter-spacing:.09em;color:#718096}.actions{display:flex;gap:8px;flex-wrap:wrap}.actions button{border:1px solid rgba(148,163,184,.22);background:#111827;color:#cbd5e1;border-radius:9px;padding:10px 12px;font-size:9px;font-weight:750;cursor:pointer}.actions button:hover{border-color:#9f7aea;color:#fff}.actions .primary{margin-left:auto;border-color:#7a63e7;background:linear-gradient(135deg,#684edc,#8c61e7);color:#fff;box-shadow:0 8px 24px rgba(104,78,220,.23)}@media(max-width:700px){.dialog{grid-template-columns:1fr}.victory-art{min-height:210px}.boss{width:170px;height:170px;left:calc(50% - 85px);top:12px}.chest{width:80px;height:80px;left:calc(50% - 40px);bottom:2px}.copy{padding:28px 22px}.copy h2{font-size:34px}.stats{grid-template-columns:1fr}.actions .primary{margin-left:0}}
</style>
