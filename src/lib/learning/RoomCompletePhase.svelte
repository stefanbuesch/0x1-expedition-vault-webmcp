<script>
  // @ts-nocheck
  export let title = 'Room cleared';
  export let detail = '';
  export let delta = 0;
  export let clearedAfter = 0;
  export let totalRooms = 1;
  export let nextRoomTitle = '';
  export let isBoss = false;
  export let isRoomComplete = true;
  export let partIndex = 0;
  export let partCount = 1;
  export let nextPartTitle = '';
  export let onContinue = () => {};

  $: runPercent = Math.round((Math.max(0, clearedAfter) / Math.max(1, totalRooms)) * 100);
  $: partPercent = Math.round(((Math.max(0, partIndex) + 1) / Math.max(1, partCount)) * 100);
  $: percent = isRoomComplete ? runPercent : partPercent;
  $: trackCount = isRoomComplete ? totalRooms : partCount;
  $: trackDone = isRoomComplete ? clearedAfter : partIndex + 1;
  $: verdict = isBoss && isRoomComplete ? 'Boss defeated' : delta >= 9 ? 'Mastery' : delta > 0 ? 'Route stabilized' : 'Complete';
</script>

<section class:boss={isBoss && isRoomComplete} class:part-phase={!isRoomComplete} class="complete-phase" aria-live="polite">
  <div class="completion-art">
    <img src={isBoss && isRoomComplete ? '/assets/boss.webp' : '/assets/vault-crest.webp'} alt="" />
    <span class="check">✓</span>
  </div>

  <span class="eyebrow">{isRoomComplete ? 'ROOM CLEARED' : 'CHECKPOINT CLEARED'}</span>
  <div class="room-title">{title}{#if !isRoomComplete}<span> · Part {partIndex + 1} of {partCount}</span>{/if}</div>
  <h2>{verdict}</h2>
  <p class="detail">{detail}</p>

  <div class="result-row">
    <div><span>BELIEF DELTA</span><b class:positive={delta > 0}>{delta > 0 ? '+' : ''}{delta}%</b></div>
    <div><span>{isRoomComplete ? 'RUN PROGRESS' : 'ROOM PROGRESS'}</span><b>{isRoomComplete ? `${clearedAfter} / ${totalRooms}` : `${partIndex + 1} / ${partCount}`}</b></div>
    <div><span>{isRoomComplete ? 'EXPEDITION' : 'CHECKPOINTS'}</span><b>{percent}%</b></div>
  </div>

  <div class="progress-track" aria-label={`${isRoomComplete ? 'Expedition' : 'Room'} ${percent}% complete`}>
    <div class="progress-fill" style={`width:${percent}%`}></div>
    {#each Array(trackCount) as _, index}
      <i class:done={index < trackDone} style={`left:${trackCount <= 1 ? 99 : 1 + (index / (trackCount - 1)) * 98}%`}></i>
    {/each}
  </div>

  {#if !isRoomComplete && nextPartTitle}
    <div class="next-unlock"><span>NEXT CHECKPOINT</span><strong>{nextPartTitle}</strong><small>Continue inside this room.</small></div>
  {:else if nextRoomTitle}
    <div class="next-unlock"><span>NEXT ROUTE</span><strong>{nextRoomTitle}</strong><small>Unlocked when you continue.</small></div>
  {:else if isBoss}
    <div class="next-unlock"><span>RUN STATE</span><strong>Extraction available</strong><small>The boss gate is down.</small></div>
  {/if}

  <button class="continue" on:click={onContinue}>
    {isBoss && isRoomComplete ? 'CLAIM VICTORY →' : isRoomComplete ? 'CONTINUE EXPEDITION →' : 'CONTINUE ROOM →'}
  </button>
</section>

<style>
  .complete-phase{position:relative;z-index:4;width:min(760px,92vw);margin:42px auto 0;padding:38px 44px 34px;text-align:center;border:1px solid rgba(148,163,184,.22);border-radius:20px;background:linear-gradient(145deg,rgba(15,23,42,.97),rgba(10,15,27,.96));box-shadow:0 38px 100px rgba(0,0,0,.48),0 0 80px rgba(97,84,223,.12);color:#f8fafc;font-family:Inter,system-ui,sans-serif;overflow:hidden}.complete-phase:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 0,rgba(97,84,223,.16),transparent 38%);pointer-events:none}.complete-phase.boss:before{background:radial-gradient(circle at 50% 0,rgba(155,79,227,.24),transparent 42%)}.complete-phase.part-phase{width:min(690px,92vw);margin-top:34px}.completion-art{position:relative;width:94px;height:94px;margin:0 auto 8px}.part-phase .completion-art{width:76px;height:76px}.completion-art img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 18px 28px rgba(97,84,223,.26))}.check{position:absolute;right:-2px;bottom:5px;width:29px;height:29px;display:grid;place-items:center;border:3px solid #111827;border-radius:50%;background:#31b989;color:#fff;font-size:15px;font-weight:900}.eyebrow{position:relative;font-size:12px;letter-spacing:.16em;color:#9186ef;font-weight:850}.room-title{position:relative;margin-top:7px;font-size:13px;color:#7f8ca0;font-weight:700}.room-title span{color:#9186ef}.complete-phase h2{position:relative;margin:8px 0 12px;font-size:clamp(32px,4vw,46px);line-height:1;letter-spacing:-.055em}.detail{position:relative;max-width:560px;margin:0 auto;color:#9ba8bb;font-size:14px;line-height:1.7}.result-row{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:24px 0 18px}.result-row div{padding:12px;border:1px solid rgba(148,163,184,.16);border-radius:10px;background:rgba(8,13,24,.52)}.result-row span,.result-row b{display:block}.result-row span{font-size:12px;letter-spacing:.1em;color:#718096}.result-row b{margin-top:5px;font-size:18px;color:#f8fafc}.result-row b.positive{color:#53d2a1}.progress-track{position:relative;height:8px;margin:4px 5px 22px;border-radius:999px;background:#283244}.progress-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#6254dd,#9588f4);box-shadow:0 0 18px rgba(126,111,235,.28);transition:width .35s ease}.progress-track i{position:absolute;top:50%;width:12px;height:12px;transform:translate(-50%,-50%);border:2px solid #465166;border-radius:50%;background:#111827}.progress-track i.done{border-color:#9186ef;background:#9186ef;box-shadow:0 0 0 3px rgba(145,134,239,.12)}.next-unlock{position:relative;display:flex;align-items:center;gap:12px;margin:0 auto 20px;padding:12px 14px;text-align:left;border:1px solid rgba(148,163,184,.16);border-radius:10px;background:rgba(8,13,24,.42)}.next-unlock span{font-size:12px;letter-spacing:.1em;color:#718096;font-weight:800}.next-unlock strong{font-size:14px;flex:1}.next-unlock small{font-size:12px;color:#718096}.continue{position:relative;border:0;border-radius:10px;background:linear-gradient(135deg,#6254dd,#8268e9);color:#fff;padding:13px 22px;font-size:13px;font-weight:850;letter-spacing:.03em;cursor:pointer;box-shadow:0 10px 30px rgba(98,84,221,.26)}.continue:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(98,84,221,.34)}@media(max-width:620px){.complete-phase{margin-top:20px;padding:28px 18px}.completion-art{width:78px;height:78px}.result-row{grid-template-columns:1fr}.next-unlock{align-items:flex-start;flex-direction:column}.continue{width:100%}}
</style>
