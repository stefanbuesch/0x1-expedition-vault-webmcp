<script>
  // @ts-nocheck
  import RoomCompletePhase from './RoomCompletePhase.svelte';
  import { evaluateTextCheckpoint } from './evaluation.js';

  export let room;
  export let belief = 60;
  export let onComplete = () => {};
  export let onBeliefChange = () => {};
  export let clearedCount = 0;
  export let totalRooms = 1;
  export let alreadyCleared = false;
  export let nextRoomTitle = '';
  export let currentPartIndex = 0;
  export let onPartChange = () => {};

  let answer = '';
  let choice = null;
  let feedback = '';
  let submitted = false;
  let watched = false;
  let completion = null;
  let lastPartKey = '';

  $: parts = Array.isArray(room?.parts) && room.parts.length ? room.parts : [room?.part].filter(Boolean);
  $: part = parts[currentPartIndex] || parts[0] || {};
  $: type = part.type || room?.nodeType || 'recall';
  $: isBoss = room?.nodeType === 'boss' || type === 'boss';
  $: isLastPart = currentPartIndex >= parts.length - 1;
  $: nextPart = parts[currentPartIndex + 1] || null;
  $: expected = part.expected || part.checklist || [];
  $: cognitionCheck = part.cognitionCheck || null;
  $: icon = iconFor(room);
  $: partKey = `${room?.refId || 'room'}:${currentPartIndex}:${part?.id || part?.type || 'part'}`;
  $: if (partKey !== lastPartKey) {
    lastPartKey = partKey;
    answer = '';
    choice = null;
    feedback = '';
    submitted = false;
    watched = false;
    completion = null;
  }

  function iconFor(value) {
    const title = String(value?.title || '').toLowerCase();
    if (value?.nodeType === 'boss' || title.includes('commutation')) return '/assets/boss.webp';
    if (title.includes('load') || title.includes('motor')) return '/assets/gear.webp';
    if (title.includes('lenz') || title.includes('balance')) return '/assets/scales.webp';
    if (title.includes('emf')) return '/assets/lightning.webp';
    if (title.includes('faraday') || value?.nodeType === 'quiz') return '/assets/book.webp';
    if (value?.nodeType === 'video') return '/assets/crystal.webp';
    return '/assets/vault-crest.webp';
  }

  function checkpointReward() {
    const configured = Number(part?.beliefDelta);
    if (Number.isFinite(configured)) return configured;
    return Math.max(3, Math.round((room?.beliefDelta || 7) / Math.max(1, parts.length)));
  }

  function checkpointLabel(value) {
    if (!value) return '';
    if (value.title) return value.title;
    if (value.type === 'video') return 'Source recall';
    if (value.type === 'quiz') return 'Knowledge check';
    if (value.type === 'dialogue') return 'Adversarial dialogue';
    if (value.type === 'case-study') return 'Transfer case';
    if (value.type === 'boss') return 'Mastery defense';
    return 'Causal recall';
  }

  function finish(success, delta, detail) {
    submitted = true;
    feedback = detail;
    onBeliefChange(delta);
    if (success) completion = { success, delta, answer, detail };
  }

  function continueAfterCompletion() {
    if (!completion) return;
    const result = completion;
    if (!isLastPart) {
      completion = null;
      onPartChange(currentPartIndex + 1, result);
      return;
    }
    completion = null;
    onComplete(result);
  }

  function submitText() {
    if (!answer.trim()) return;
    const outcome = evaluateTextCheckpoint({
      text: answer,
      expected,
      type,
      roomId: room?.refId || '',
      isBoss
    });
    const reward = checkpointReward();
    const delta = outcome.success ? reward : -Math.max(4, Math.round(reward * .8));
    finish(
      outcome.success,
      delta,
      outcome.success
        ? `${outcome.detail} Route evidence accepted.`
        : `${outcome.detail} The corridor stays closed until the missing causal links are repaired.`
    );
  }

  function submitQuiz(index) {
    if (submitted) return;
    choice = index;
    const success = index === part.correctIndex;
    const reward = checkpointReward();
    if (success) {
      finish(true, reward, part.explanation);
      return;
    }
    feedback = `Not stable. ${part.explanation}`;
    onBeliefChange(-Math.max(4, Math.round(reward * .8)));
  }

  function completeVideo() {
    if (watched) return;
    watched = true;
    const delta = checkpointReward();
    onBeliefChange(delta);
    completion = { success: true, delta, detail: isLastPart ? 'Source secured. The room is ready to clear.' : 'Source secured. Continue into retrieval before the room clears.' };
  }
</script>

<div class:boss={isBoss} class="encounter">
  <div class="map-ghost"></div>
  <div class="ambient ambient-one"></div>
  <div class="ambient ambient-two"></div>

  <header class="room-identity">
    <div class="badge-wrap"><img src={icon} alt="" /></div>
    <div class="identity-copy">
      <span>{isBoss ? 'BOSS ENCOUNTER' : type === 'video' ? 'SOURCE ROOM' : type === 'quiz' ? 'KNOWLEDGE CHECK' : 'CAUSAL ENCOUNTER'}</span>
      <h1>{room.title}</h1>
      <p>{room.subtitle}</p>
      {#if parts.length > 1}
        <div class="part-progress">
          <span>PART {currentPartIndex + 1} / {parts.length}</span>
          <div>{#each parts as _, index}<i class:done={index < currentPartIndex} class:current={index === currentPartIndex}></i>{/each}</div>
        </div>
      {/if}
      {#if cognitionCheck}
        <div class="cognition-check"><i></i><span>COGNITION CHECK</span><b>{cognitionCheck.kind}</b></div>
      {/if}
    </div>
    <div class="belief-chip"><small>LIVE BELIEF</small><b>{belief}%</b></div>
  </header>

  {#if completion}
    <RoomCompletePhase
      title={room.title}
      detail={completion.detail}
      delta={completion.delta}
      clearedAfter={Math.min(totalRooms, clearedCount + (alreadyCleared || !isLastPart ? 0 : 1))}
      {totalRooms}
      nextRoomTitle={isLastPart ? nextRoomTitle : ''}
      {isBoss}
      isRoomComplete={isLastPart}
      partIndex={currentPartIndex}
      partCount={parts.length}
      nextPartTitle={checkpointLabel(nextPart)}
      onContinue={continueAfterCompletion}
    />
  {:else if type === 'video'}
    <section class="cinema encounter-surface">
      <div class="frame-wrap">
        <div class="frame-label"><span>SOURCE FEED</span><b>16:9 VERIFIED MEDIA</b></div>
        <div class="frame">
          <iframe
            src={part.videoUrl}
            title={part.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
      </div>
      <aside class="mission-brief">
        <span class="eyebrow">ROOM OBJECTIVE</span>
        <h2>{part.title}</h2>
        <p>{part.prompt}</p>
        <div class="source-meta"><span>Source</span><b>{part.sourceLabel || 'External source'}</b></div>
        <div class="human-lock"><i></i><span>Agent cannot counterfeit source viewing. Human confirmation required.</span></div>
        <button class="primary" class:complete={watched} on:click={completeVideo}>{watched ? 'SOURCE LOGGED' : 'COMPLETE SOURCE ROOM →'}</button>
      </aside>
    </section>
  {:else if type === 'quiz'}
    <section class="quiz-room encounter-surface">
      <div class="quiz-brief">
        <span class="eyebrow">CHECKPOINT QUESTION</span>
        <h2>{part.question}</h2>
        <p>One answer stabilizes the route. A miss costs belief but leaves the room open for recovery.</p>
        <div class="stakes"><span>Belief reward <b>+{room.beliefDelta || 6}</b></span><span>Failure pressure <b>−7</b></span></div>
      </div>
      <div class="options">
        {#each part.options as option, index}
          <button
            class:selected={choice === index}
            class:wrong={choice === index && index !== part.correctIndex}
            class:right={submitted && index === part.correctIndex}
            on:click={() => submitQuiz(index)}
          >
            <span class="letter">{String.fromCharCode(65 + index)}</span>
            <span class="option-copy">{option}</span>
          </button>
        {/each}
        {#if feedback}<div class:negative={!submitted} class="feedback">{feedback}</div>{/if}
      </div>
    </section>
  {:else}
    <section class="recall-room encounter-surface">
      <div class="brief">
        <span class="eyebrow">{isBoss ? 'MASTERY DEFENSE' : type === 'dialogue' ? 'ADVERSARIAL DIALOGUE' : type === 'case-study' ? 'FIELD CASE' : 'CAUSAL FREE RECALL'}</span>
        <h2>{part.question}</h2>
        <p class="room-rule">Do not keyword-match. Build the mechanism so every arrow is earned.</p>

        {#if cognitionCheck?.sourceHidden}
          <div class="blind-check"><span>BLIND TRANSFER</span><p>The source answer is intentionally hidden here. Solve from the model you learned, not from copied wording.</p></div>
        {/if}
        {#if part.hint && !cognitionCheck?.sourceHidden}
          <div class="intel"><span>INTEL</span><p>{part.hint}</p></div>
        {/if}
        {#if part.probes && !cognitionCheck?.sourceHidden}
          <div class="probe-list"><span>PRESSURE PROBES</span>{#each part.probes as probe}<p>› {probe}</p>{/each}</div>
        {/if}
        {#if expected.length && !cognitionCheck?.sourceHidden}
          <div class="rubric">
            <span>{isBoss ? 'BOSS RUBRIC' : 'TARGET CONCEPTS'}</span>
            <div>{#each expected as item}<b>□ {item}</b>{/each}</div>
          </div>
        {/if}
      </div>

      <div class="answer-panel">
        <div class="answer-heading">
          <span>{type === 'dialogue' ? 'YOUR REBUTTAL' : isBoss ? 'FINAL SYSTEMS ARGUMENT' : 'FIELD NOTE'}</span>
          <small>{expected.length || 'open'} evidence targets</small>
        </div>
        <textarea
          bind:value={answer}
          disabled={submitted && feedback.includes('accepted')}
          placeholder={isBoss ? 'Defend the full system. Identify the mechanism, constraint, counterargument, and failure mode…' : 'Build the causal chain in your own words. Explain why each step follows…'}
        ></textarea>
        <div class="answer-footer">
          <span>{answer.trim() ? `${answer.trim().split(/\s+/).length} words` : 'No evidence committed yet'}</span>
          <button class="primary" disabled={!answer.trim()} on:click={submitText}>{isBoss ? 'STRIKE THE BOSS →' : 'COMMIT EVIDENCE →'}</button>
        </div>
        {#if feedback}<div class:negative={feedback.includes('closed') || feedback.includes('Missing') || feedback.includes('Coverage')} class="feedback">{feedback}</div>{/if}
      </div>
    </section>
  {/if}

  <div class="belief-ambient" style={`--belief:${belief}%`}></div>
</div>

<style>
  .encounter{--accent:#6154df;--accent-soft:#8f86f3;--danger:#c8455f;--gold:#d6a33a;min-height:calc(100vh - 74px);position:relative;overflow:hidden;padding:18px clamp(20px,4vw,62px) 34px;background:linear-gradient(135deg,#0b1020 0%,#111827 55%,#0a0e18 100%);color:#f8fafc;font-family:Inter,system-ui,sans-serif}.encounter.boss{--accent:#9b4fe3;--accent-soft:#d17cff;--danger:#ed526c;background:linear-gradient(135deg,#160b22,#170d27 48%,#090711)}
  .map-ghost{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,12,23,.93),rgba(9,13,24,.83)),var(--map-image) center/cover no-repeat;opacity:.36;filter:saturate(.65) contrast(1.06)}.boss .map-ghost{filter:hue-rotate(205deg) saturate(.65) contrast(1.05)}
  .ambient{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none}.ambient-one{width:420px;height:420px;right:-80px;top:4%;background:rgba(97,84,223,.22)}.ambient-two{width:320px;height:320px;left:12%;bottom:-160px;background:rgba(20,184,166,.09)}.boss .ambient-one{background:rgba(155,79,227,.28)}
  .room-identity{position:relative;z-index:2;width:min(1360px,100%);display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;margin:8px auto 16px}.badge-wrap{width:76px;height:76px;display:grid;place-items:center}.badge-wrap img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 14px 20px rgba(0,0,0,.38))}.identity-copy>span,.eyebrow{font-size:9px;letter-spacing:.14em;color:var(--accent-soft);font-weight:800}.identity-copy h1{font-size:clamp(31px,3.6vw,48px);letter-spacing:-.055em;line-height:.96;margin:6px 0 5px}.identity-copy p{font-size:12px;color:#91a0b7;margin:0}.part-progress{display:flex;align-items:center;gap:10px;margin-top:9px}.part-progress>span{font-size:7px;letter-spacing:.11em;color:#718096;font-weight:800}.part-progress>div{display:flex;gap:5px}.part-progress i{width:20px;height:3px;border-radius:999px;background:#303b4e}.part-progress i.done{background:#6254dd}.part-progress i.current{background:#9a8df6;box-shadow:0 0 10px rgba(154,141,246,.35)}.belief-chip{min-width:108px;text-align:right;border-left:1px solid rgba(148,163,184,.18);padding-left:18px}.belief-chip small,.belief-chip b{display:block}.belief-chip small{font-size:7px;letter-spacing:.11em;color:#718096}.belief-chip b{font-size:25px;letter-spacing:-.04em;color:#fff}
  .encounter-surface{position:relative;z-index:2;width:min(1360px,100%);margin:0 auto;border:1px solid rgba(148,163,184,.2);border-radius:17px;background:linear-gradient(145deg,rgba(15,23,42,.94),rgba(12,18,32,.87));box-shadow:0 34px 90px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.025);overflow:hidden;backdrop-filter:blur(18px)}
  .cinema{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(310px,.7fr);min-height:610px}.frame-wrap{padding:18px;background:#060a12}.frame-label{height:34px;display:flex;align-items:center;justify-content:space-between;color:#718096;font-size:8px;letter-spacing:.1em}.frame-label span{color:var(--accent-soft);font-weight:800}.frame{position:relative;aspect-ratio:16/9;background:radial-gradient(circle at 50% 45%,#111827,#000 66%);border-radius:11px;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.48)}.frame:before{content:'VERIFIED SOURCE';position:absolute;inset:0;display:grid;place-items:center;color:#273244;font-size:9px;letter-spacing:.15em;font-weight:800}.frame iframe{position:absolute;z-index:1;inset:0;width:100%;height:100%;border:0}.mission-brief{padding:38px;display:flex;flex-direction:column;justify-content:center;border-left:1px solid rgba(148,163,184,.16)}.mission-brief h2{font-size:30px;line-height:1.06;letter-spacing:-.04em;margin:10px 0 14px}.mission-brief>p{font-size:12px;line-height:1.65;color:#a8b4c6}.source-meta{margin:18px 0;padding:12px 0;border-block:1px solid rgba(148,163,184,.16)}.source-meta span,.source-meta b{display:block}.source-meta span{font-size:8px;color:#6f7c90;text-transform:uppercase;letter-spacing:.1em}.source-meta b{font-size:10px;color:#cbd5e1;margin-top:4px;word-break:break-word}.human-lock{display:flex;gap:9px;align-items:flex-start;margin:6px 0 18px;padding:11px;border:1px solid rgba(214,163,58,.28);background:rgba(214,163,58,.07);border-radius:9px}.human-lock i{width:8px;height:8px;margin-top:3px;border-radius:50%;background:var(--gold);box-shadow:0 0 13px rgba(214,163,58,.6)}.human-lock span{font-size:9px;line-height:1.5;color:#d7c8a7}
  .primary{border:0;border-radius:9px;background:linear-gradient(135deg,var(--accent),#7c66ee);color:#fff;padding:12px 16px;font:800 10px Inter,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(97,84,223,.22)}.primary:hover{transform:translateY(-1px);box-shadow:0 10px 30px rgba(97,84,223,.32)}.primary:disabled{opacity:.3;cursor:not-allowed;transform:none}.primary.complete{background:#15845e}
  .quiz-room{display:grid;grid-template-columns:minmax(300px,.82fr) minmax(0,1.18fr);min-height:590px}.quiz-brief{padding:42px;border-right:1px solid rgba(148,163,184,.16);background:linear-gradient(160deg,rgba(97,84,223,.09),transparent 56%)}.quiz-brief h2{font-size:clamp(27px,3vw,42px);line-height:1.08;letter-spacing:-.045em;margin:14px 0 16px}.quiz-brief>p{font-size:11px;line-height:1.6;color:#96a3b7}.stakes{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}.stakes span{padding:8px 10px;border:1px solid rgba(148,163,184,.18);border-radius:8px;background:rgba(15,23,42,.64);font-size:8px;color:#8492a7}.stakes b{color:#fff}.options{padding:34px 38px;display:flex;flex-direction:column;justify-content:center;gap:11px}.options button{display:grid;grid-template-columns:48px 1fr;align-items:center;text-align:left;border:1px solid rgba(148,163,184,.18);background:rgba(15,23,42,.62);color:#cbd5e1;border-radius:11px;overflow:hidden;cursor:pointer;transition:.16s;min-height:56px}.options button:hover,.options button.selected{border-color:var(--accent-soft);background:rgba(97,84,223,.12);transform:translateX(3px)}.options button.right{border-color:#31b989;background:rgba(49,185,137,.1)}.options button.wrong{border-color:var(--danger);background:rgba(200,69,95,.1)}.letter{height:100%;display:grid;place-items:center;border-right:1px solid rgba(148,163,184,.16);font-size:12px;font-weight:800;color:var(--accent-soft)}.option-copy{padding:16px;font-size:11px;line-height:1.45}
  .recall-room{display:grid;grid-template-columns:minmax(340px,.94fr) minmax(0,1.06fr);min-height:590px}.brief{padding:34px 36px;border-right:1px solid rgba(148,163,184,.16);background:linear-gradient(160deg,rgba(97,84,223,.09),transparent 54%)}.brief h2{font-size:clamp(26px,2.9vw,38px);line-height:1.11;letter-spacing:-.04em;margin:11px 0}.room-rule{font-size:10px;line-height:1.55;color:#7f8da2;margin:0 0 16px}.intel,.probe-list,.rubric{margin-top:11px;padding:11px;border:1px solid rgba(148,163,184,.17);background:rgba(7,12,22,.42);border-radius:10px}.intel>span,.probe-list>span,.rubric>span{display:block;font-size:8px;letter-spacing:.1em;color:#7f8ba0;font-weight:800}.intel p,.probe-list p{font-size:9px;line-height:1.55;color:#b4becd;margin:6px 0 0}.rubric>div{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.rubric b{padding:6px 7px;border:1px solid rgba(148,163,184,.14);border-radius:7px;font-size:8px;color:#aab4c4;font-weight:600}.answer-panel{padding:28px 30px;display:flex;flex-direction:column}.answer-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.answer-heading span{font-size:9px;letter-spacing:.12em;color:var(--accent-soft);font-weight:800}.answer-heading small{font-size:8px;color:#738096}.answer-panel textarea{flex:1;min-height:330px;width:100%;resize:none;border:1px solid rgba(148,163,184,.2);background:rgba(5,9,17,.68);border-radius:12px;color:#f1f5f9;padding:18px;font:12px/1.7 Inter,sans-serif;outline:none}.answer-panel textarea:focus{border-color:var(--accent-soft);box-shadow:0 0 0 3px rgba(97,84,223,.11),0 16px 40px rgba(0,0,0,.18)}.answer-footer{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:10px}.answer-footer>span{font-size:8px;color:#718096}.feedback{margin-top:11px;padding:11px 12px;border:1px solid rgba(49,185,137,.32);background:rgba(49,185,137,.08);border-radius:9px;color:#8de0bd;font-size:9px;line-height:1.5}.feedback.negative{border-color:rgba(200,69,95,.4);background:rgba(200,69,95,.08);color:#ffa4b5}
  .belief-ambient{position:absolute;left:0;right:0;bottom:0;height:4px;background:linear-gradient(90deg,#c8455f 0%,#d6a33a 42%,var(--accent-soft) var(--belief),rgba(51,65,85,.4) var(--belief));box-shadow:0 -10px 30px rgba(97,84,223,.13)}
  .cognition-check{display:flex;align-items:center;gap:7px;width:max-content;margin-top:9px;padding:5px 8px;border:1px solid rgba(145,134,239,.28);border-radius:999px;background:rgba(97,84,223,.08)}.cognition-check i{width:6px;height:6px;border-radius:50%;background:#9a8df6;box-shadow:0 0 10px rgba(154,141,246,.55)}.cognition-check span{font-size:6px;letter-spacing:.13em;color:#7f8ba0;font-weight:850}.cognition-check b{font-size:7px;color:#c1bbff;text-transform:uppercase;letter-spacing:.05em}.blind-check{margin:11px 0 0;padding:10px 11px;border:1px solid rgba(145,134,239,.22);border-left:3px solid #9186ef;border-radius:9px;background:rgba(97,84,223,.07)}.blind-check span{display:block;font-size:7px;letter-spacing:.12em;color:#a9a0ff;font-weight:850}.blind-check p{margin:5px 0 0;font-size:8px;line-height:1.5;color:#9aa7bb}
  @media(max-width:960px){.cinema,.quiz-room,.recall-room{grid-template-columns:1fr}.mission-brief,.quiz-brief,.brief{border-left:0;border-right:0;border-top:1px solid rgba(148,163,184,.16)}.frame-wrap{order:1}.mission-brief{order:2}.room-identity{grid-template-columns:auto 1fr}.belief-chip{display:none}.recall-room{min-height:auto}.answer-panel textarea{min-height:280px}.rubric>div{grid-template-columns:1fr 1fr}}
  @media(max-width:620px){.encounter{padding:18px 12px 40px}.room-identity{margin:12px 0 17px}.badge-wrap{width:64px;height:64px}.identity-copy h1{font-size:32px}.cinema,.quiz-room,.recall-room{border-radius:12px}.mission-brief,.quiz-brief,.brief,.answer-panel,.options{padding:22px}.rubric>div{grid-template-columns:1fr}.frame-wrap{padding:10px}.answer-panel textarea{min-height:240px}.answer-footer{align-items:flex-start;flex-direction:column}.answer-footer .primary{width:100%}}
</style>
