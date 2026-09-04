<script>
  // @ts-nocheck
  import RoomCompletePhase from './RoomCompletePhase.svelte';
  import { evaluateTextCheckpoint } from './evaluation.js';

  export let room;
  export let belief = 60;
  export let onComplete = () => {};
  export let onBeliefChange = () => {};
  export let onFailure = () => {};
  export let strikes = 0;
  export let maxStrikes = 3;
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
  let chainSteps = [];
  let dialogueTurn = 0;
  let dialogueLog = [];
  let caseAnswers = {};
  let activeCaseIndex = 0;
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
  $: chainCount = Math.max(3, Math.min(5, expected.length || 4));
  $: caseFields = part.caseFields || (isBoss ? [
    { id: 'claim', label: room?.refId === 'motor-load' ? 'Speed' : 'Central claim', prompt: room?.refId === 'motor-load' ? 'What happens to shaft speed immediately and as the motor settles?' : 'State the claim you are defending.' },
    { id: 'mechanism', label: room?.refId === 'motor-load' ? 'Back-EMF' : 'Mechanism', prompt: room?.refId === 'motor-load' ? 'What changes in the opposing induced voltage, and why?' : 'Explain the causal mechanism.' },
    { id: 'evidence', label: room?.refId === 'motor-load' ? 'Current' : 'Evidence', prompt: room?.refId === 'motor-load' ? 'Predict armature current and connect it to back-EMF.' : 'Name the strongest source-grounded evidence.' },
    { id: 'boundary', label: room?.refId === 'motor-load' ? 'Torque' : 'Boundary', prompt: room?.refId === 'motor-load' ? 'Predict torque and explain why it changes.' : 'State a boundary condition or failure mode.' },
    { id: 'falsifier', label: room?.refId === 'motor-load' ? 'Power / failure' : 'Falsifier', prompt: room?.refId === 'motor-load' ? 'What happens to electrical power/heat if the shaft remains stalled?' : 'Name an observation that would change your mind.' }
  ] : [
    { id: 'condition', label: 'Changed condition', prompt: 'What condition are you changing?' },
    { id: 'prediction', label: 'Prediction', prompt: 'What should change, and why?' },
    { id: 'invariant', label: 'Invariant', prompt: 'What should remain stable?' },
    { id: 'falsifier', label: 'Falsifier', prompt: 'What observation would prove your prediction wrong?' }
  ]);
  $: activeCaseField = caseFields[activeCaseIndex] || null;
  $: partKey = `${room?.refId || 'room'}:${currentPartIndex}:${part?.id || part?.type || 'part'}`;
  $: if (partKey !== lastPartKey) {
    lastPartKey = partKey;
    answer = '';
    choice = null;
    feedback = '';
    submitted = false;
    watched = false;
    completion = null;
    chainSteps = Array(chainCount).fill('');
    dialogueTurn = 0;
    dialogueLog = [];
    caseAnswers = {};
    activeCaseIndex = 0;
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
    submitted = success;
    feedback = detail;
    onBeliefChange(delta);
    if (success) completion = { success, delta, answer, detail };
    else onFailure(detail);
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
      prompt: part.question || part.prompt || part.title || '',
      type,
      roomId: room?.refId || '',
      isBoss,
      sourceHidden: Boolean(cognitionCheck?.sourceHidden)
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
    onFailure(feedback);
  }

  function submitRecallChain() {
    if (chainSteps.some((step) => !String(step || '').trim())) {
      feedback = 'Every causal link needs an explicit explanation before you can commit the chain.';
      return;
    }
    answer = chainSteps.map((step, index) => `Step ${index + 1}: ${String(step).trim()}`).join(' → ');
    const outcome = evaluateTextCheckpoint({
      text: answer,
      expected,
      prompt: part.question || '',
      type: 'recall',
      roomId: room?.refId || '',
      sourceHidden: Boolean(cognitionCheck?.sourceHidden)
    });
    const reward = checkpointReward();
    finish(outcome.success, outcome.success ? reward : -Math.max(4, Math.round(reward * .8)), outcome.success ? `${outcome.detail} Causal chain locked.` : `${outcome.detail} Chain broke under review.`);
  }

  function submitDialogueTurn() {
    if (!answer.trim()) return;
    const split = Math.max(1, Math.ceil(expected.length / 2));
    const turnTargets = dialogueTurn === 0 ? expected.slice(0, split) : expected.slice(split);
    const targets = turnTargets.length ? turnTargets : expected;
    const outcome = evaluateTextCheckpoint({
      text: answer,
      expected: targets,
      prompt: dialogueTurn === 0 ? (part.question || '') : (part.probes?.[0] || part.question || ''),
      type: 'dialogue',
      roomId: room?.refId || '',
      sourceHidden: Boolean(cognitionCheck?.sourceHidden)
    });
    const reward = checkpointReward();
    if (!outcome.success) {
      onBeliefChange(-Math.max(4, Math.round(reward * .6)));
      feedback = `${outcome.detail} The opponent takes the point.`;
      onFailure(feedback);
      return;
    }
    dialogueLog = [...dialogueLog, { turn: dialogueTurn + 1, text: answer }];
    if (dialogueTurn === 0 && expected.length > 1) {
      onBeliefChange(Math.max(2, Math.round(reward * .4)));
      dialogueTurn = 1;
      answer = '';
      feedback = part.probes?.[0] || 'Opponent: apply that principle to a concrete consequence. What prediction follows?';
      return;
    }
    finish(true, Math.max(2, Math.round(reward * .6)), `${outcome.detail} Adversarial exchange won in ${dialogueLog.length + 1} turns.`);
  }

  function submitCaseBoard() {
    if (caseFields.some((field) => !String(caseAnswers[field.id] || '').trim())) {
      feedback = 'Complete every system prediction before committing the case.';
      return;
    }
    answer = caseFields.map((field) => `${field.label}: ${String(caseAnswers[field.id]).trim()}`).join('\n');
    let outcome;
    if (part.caseFields?.some((field) => Array.isArray(field.expected) && field.expected.length)) {
      const scores = part.caseFields.map((field) => {
        const text = String(caseAnswers[field.id] || '').toLowerCase();
        const hits = (field.expected || []).filter((token) => text.includes(String(token).toLowerCase())).length;
        return hits > 0 ? 1 : 0;
      });
      const score = scores.reduce((sum, value) => sum + value, 0) / Math.max(1, scores.length);
      outcome = { success: score >= .8, score, detail: `Systems board coverage ${Math.round(score * 100)}%.` };
    } else {
      outcome = evaluateTextCheckpoint({
        text: answer,
        expected,
        prompt: part.question || '',
        type: isBoss ? 'boss' : 'case-study',
        roomId: room?.refId || '',
        isBoss,
        sourceHidden: Boolean(cognitionCheck?.sourceHidden)
      });
    }
    const reward = checkpointReward();
    finish(outcome.success, outcome.success ? reward : -Math.max(5, Math.round(reward * .8)), outcome.success ? `${outcome.detail} System prediction accepted.` : `${outcome.detail} The case collapses under load.`);
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
  {:else if type === 'recall' || type === 'free_recall' || type === 'short_response'}
    <section class="chain-room encounter-surface">
      <div class="brief chain-brief">
        <span class="eyebrow">CAUSAL CHAIN BUILDER</span>
        <h2>{part.question}</h2>
        <p class="room-rule">Build the mechanism one link at a time. Every link is scored; a broken chain costs a strike.</p>
        {#if cognitionCheck?.sourceHidden}
          <div class="blind-check"><span>BLIND TRANSFER</span><p>No target wording is exposed. Reconstruct the model from memory.</p></div>
        {:else if part.hint}
          <div class="intel"><span>INTEL</span><p>{part.hint}</p></div>
        {/if}
        <div class="strike-panel"><span>STRIKE RISK</span><b>{strikes} / {maxStrikes}</b><p>{Math.max(0, maxStrikes - strikes)} mistakes remain before the run fails.</p></div>
      </div>
      <div class="chain-builder">
        <div class="answer-heading"><span>MECHANISM PATH</span><small>{chainCount} required links</small></div>
        <div class="chain-stack">
          {#each Array(chainCount) as _, index}
            <label class="chain-step" class:complete={Boolean(String(chainSteps[index] || '').trim())}>
              <span class="chain-index">0{index + 1}</span>
              <div class="chain-copy"><b>{index === 0 ? 'Initial change' : index === chainCount - 1 ? 'Observable consequence' : `Causal link ${index}`}</b><small>State what changes and why the next step follows.</small></div>
              <textarea rows="2" value={chainSteps[index] || ''} on:input={(event) => { chainSteps[index] = event.currentTarget.value; chainSteps = [...chainSteps]; }} placeholder="Write the mechanism…"></textarea>
              <i class="chain-state">{String(chainSteps[index] || '').trim() ? '✓' : '○'}</i>
            </label>
            {#if index < chainCount - 1}<i class="chain-arrow">↓</i>{/if}
          {/each}
        </div>
        {#if feedback}<div class:negative={!feedback.includes('locked')} class="feedback">{feedback}</div>{/if}
        <div class="answer-footer"><span>{chainSteps.filter((step) => String(step || '').trim()).length}/{chainCount} links committed</span><button class="primary" disabled={chainSteps.some((step) => !String(step || '').trim())} on:click={submitRecallChain}>LOCK CAUSAL CHAIN →</button></div>
      </div>
    </section>
  {:else if type === 'dialogue'}
    <section class="dialogue-room encounter-surface">
      <div class="opponent-panel">
        <div class="dialogue-topline"><span class="eyebrow">ADVERSARIAL DIALOGUE</span><div class="turn-meter"><span>TURN {dialogueTurn + 1}/{expected.length > 1 ? 2 : 1}</span><b>{strikes}/{maxStrikes} strikes</b></div></div>
        <div class="opponent-message"><img src={icon} alt="" /><div><span>OPPONENT</span><blockquote>{dialogueTurn === 0 ? part.question : (part.probes?.[0] || 'Apply your principle to a concrete prediction. What follows?')}</blockquote></div></div>
        {#if dialogueLog.length}
          <div class="dialogue-log">{#each dialogueLog as item}<div><span>YOUR TURN {item.turn}</span><p>{item.text}</p></div>{/each}</div>
        {/if}
        {#if cognitionCheck?.sourceHidden}<div class="blind-check"><span>NO ANSWER KEY</span><p>The opponent knows the rubric; you do not. Win the exchange from the model you learned.</p></div>{/if}
      </div>
      <div class="dialogue-response">
        <div class="composer-shell">
          <div class="composer-head"><span>YOUR REBUTTAL</span><small>{Math.max(0, maxStrikes - strikes)} strikes remaining</small></div>
          <textarea bind:value={answer} placeholder={dialogueTurn === 0 ? 'Refute the claim with an explicit causal argument…' : 'Answer the counter-pressure with a concrete consequence or prediction…'}></textarea>
          <div class="composer-foot"><span>{answer.trim() ? `${answer.trim().split(/\s+/).length} words` : 'Build the argument, not the keyword list.'}</span><kbd>⌘ ↵</kbd></div>
        </div>
        {#if feedback}<div class:negative={feedback.includes('takes the point') || feedback.includes('Missing') || feedback.includes('coverage 0')} class="feedback">{feedback}</div>{/if}
        <button class="primary dialogue-submit" disabled={!answer.trim()} on:click={submitDialogueTurn}>{dialogueTurn === 0 && expected.length > 1 ? 'ANSWER OPPONENT →' : 'CLOSE THE ARGUMENT →'}</button>
      </div>
    </section>
  {:else if type === 'case-study' || type === 'case_study' || type === 'boss' || isBoss}
    <section class="case-room encounter-surface">
      <div class="case-brief">
        <span class="eyebrow">{isBoss ? 'BOSS SYSTEMS BOARD' : 'TRANSFER SIMULATION'}</span>
        <h2>{part.question}</h2>
        <p>Commit every system variable before evaluation. The board is judged as one coupled model, not as a paragraph.</p>
        <div class="strike-panel danger"><span>{isBoss ? 'BOSS STAKES' : 'STRIKE RISK'}</span><b>{strikes} / {maxStrikes}</b><p>A failed board consumes one strike. Three strikes ends the expedition.</p></div>
      </div>
      <div class="systems-board">
        <div class="answer-heading"><span>SYSTEM PREDICTIONS</span><small>{caseFields.filter((field) => String(caseAnswers[field.id] || '').trim()).length}/{caseFields.length} committed</small></div>
        <div class="system-tabs">
          {#each caseFields as field, index}
            <button class:active={index === activeCaseIndex} class:complete={Boolean(String(caseAnswers[field.id] || '').trim())} on:click={() => activeCaseIndex = index}><span>0{index + 1}</span><b>{field.label}</b><i>{String(caseAnswers[field.id] || '').trim() ? '✓' : '○'}</i></button>
          {/each}
        </div>
        {#if activeCaseField}
          <section class="system-focus">
            <div class="system-focus-label"><span>VARIABLE {String(activeCaseIndex + 1).padStart(2, '0')}</span><b>{activeCaseField.label}</b></div>
            <h3>{activeCaseField.prompt}</h3>
            <textarea value={caseAnswers[activeCaseField.id] || ''} on:input={(event) => caseAnswers = { ...caseAnswers, [activeCaseField.id]: event.currentTarget.value }} placeholder="Commit the prediction and explain why it follows…"></textarea>
            <div class="system-nav">
              <button class="ghost" disabled={activeCaseIndex === 0} on:click={() => activeCaseIndex = Math.max(0, activeCaseIndex - 1)}>← Previous</button>
              {#if activeCaseIndex < caseFields.length - 1}
                <button class="primary" disabled={!String(caseAnswers[activeCaseField.id] || '').trim()} on:click={() => activeCaseIndex = Math.min(caseFields.length - 1, activeCaseIndex + 1)}>LOCK VARIABLE · NEXT →</button>
              {:else}
                <button class="primary" disabled={caseFields.some((field) => !String(caseAnswers[field.id] || '').trim())} on:click={submitCaseBoard}>{isBoss ? 'COMMIT BOSS MODEL →' : 'RUN SIMULATION →'}</button>
              {/if}
            </div>
          </section>
        {/if}
        {#if feedback}<div class:negative={!feedback.includes('accepted')} class="feedback">{feedback}</div>{/if}
      </div>
    </section>
  {:else}
    <section class="recall-room encounter-surface">
      <div class="brief"><span class="eyebrow">OPEN RESPONSE</span><h2>{part.question || part.prompt || part.title}</h2><p class="room-rule">Explain the mechanism precisely. Failed evidence consumes a strike.</p></div>
      <div class="answer-panel"><div class="answer-heading"><span>YOUR RESPONSE</span><small>Strike {strikes}/{maxStrikes}</small></div><textarea bind:value={answer} placeholder="Build the causal argument…"></textarea><div class="answer-footer"><span>{answer.trim() ? `${answer.trim().split(/\s+/).length} words` : 'No evidence committed yet'}</span><button class="primary" disabled={!answer.trim()} on:click={submitText}>COMMIT EVIDENCE →</button></div>{#if feedback}<div class:negative={!feedback.includes('accepted')} class="feedback">{feedback}</div>{/if}</div>
    </section>
  {/if}

  <div class="belief-ambient" style={`--belief:${belief}%`}></div>
</div>

<style>
  .encounter{--accent:#6154df;--accent-soft:#8f86f3;--danger:#c8455f;--gold:#d6a33a;min-height:calc(100vh - 74px);position:relative;overflow:hidden;padding:18px clamp(20px,4vw,62px) 34px;background:linear-gradient(135deg,#0b1020 0%,#111827 55%,#0a0e18 100%);color:#f8fafc;font-family:Inter,system-ui,sans-serif}.encounter.boss{--accent:#9b4fe3;--accent-soft:#d17cff;--danger:#ed526c;background:linear-gradient(135deg,#160b22,#170d27 48%,#090711)}
  .map-ghost{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,12,23,.93),rgba(9,13,24,.83)),var(--map-image) center/cover no-repeat;opacity:.36;filter:saturate(.65) contrast(1.06)}.boss .map-ghost{filter:hue-rotate(205deg) saturate(.65) contrast(1.05)}
  .ambient{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none}.ambient-one{width:420px;height:420px;right:-80px;top:4%;background:rgba(97,84,223,.22)}.ambient-two{width:320px;height:320px;left:12%;bottom:-160px;background:rgba(20,184,166,.09)}.boss .ambient-one{background:rgba(155,79,227,.28)}
  .room-identity{position:relative;z-index:2;width:min(1360px,100%);display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;margin:8px auto 16px}.badge-wrap{width:76px;height:76px;display:grid;place-items:center}.badge-wrap img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 14px 20px rgba(0,0,0,.38))}.identity-copy>span,.eyebrow{font-size:12px;letter-spacing:.14em;color:var(--accent-soft);font-weight:800}.identity-copy h1{font-size:clamp(31px,3.6vw,48px);letter-spacing:-.055em;line-height:.96;margin:6px 0 5px}.identity-copy p{font-size:12px;color:#91a0b7;margin:0}.part-progress{display:flex;align-items:center;gap:10px;margin-top:9px}.part-progress>span{font-size:12px;letter-spacing:.11em;color:#718096;font-weight:800}.part-progress>div{display:flex;gap:5px}.part-progress i{width:20px;height:3px;border-radius:999px;background:#303b4e}.part-progress i.done{background:#6254dd}.part-progress i.current{background:#9a8df6;box-shadow:0 0 10px rgba(154,141,246,.35)}.belief-chip{min-width:108px;text-align:right;border-left:1px solid rgba(148,163,184,.18);padding-left:18px}.belief-chip small,.belief-chip b{display:block}.belief-chip small{font-size:12px;letter-spacing:.11em;color:#718096}.belief-chip b{font-size:25px;letter-spacing:-.04em;color:#fff}
  .encounter-surface{position:relative;z-index:2;width:min(1360px,100%);margin:0 auto;border:1px solid rgba(148,163,184,.2);border-radius:17px;background:linear-gradient(145deg,rgba(15,23,42,.94),rgba(12,18,32,.87));box-shadow:0 34px 90px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.025);overflow:hidden;backdrop-filter:blur(18px)}
  .cinema{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(310px,.7fr);min-height:610px}.frame-wrap{padding:18px;background:#060a12}.frame-label{height:34px;display:flex;align-items:center;justify-content:space-between;color:#718096;font-size:12px;letter-spacing:.1em}.frame-label span{color:var(--accent-soft);font-weight:800}.frame{position:relative;aspect-ratio:16/9;background:radial-gradient(circle at 50% 45%,#111827,#000 66%);border-radius:11px;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.48)}.frame:before{content:'VERIFIED SOURCE';position:absolute;inset:0;display:grid;place-items:center;color:#273244;font-size:12px;letter-spacing:.15em;font-weight:800}.frame iframe{position:absolute;z-index:1;inset:0;width:100%;height:100%;border:0}.mission-brief{padding:38px;display:flex;flex-direction:column;justify-content:center;border-left:1px solid rgba(148,163,184,.16)}.mission-brief h2{font-size:30px;line-height:1.06;letter-spacing:-.04em;margin:10px 0 14px}.mission-brief>p{font-size:12px;line-height:1.65;color:#a8b4c6}.source-meta{margin:18px 0;padding:12px 0;border-block:1px solid rgba(148,163,184,.16)}.source-meta span,.source-meta b{display:block}.source-meta span{font-size:12px;color:#6f7c90;text-transform:uppercase;letter-spacing:.1em}.source-meta b{font-size:13px;color:#cbd5e1;margin-top:4px;word-break:break-word}.human-lock{display:flex;gap:9px;align-items:flex-start;margin:6px 0 18px;padding:11px;border:1px solid rgba(214,163,58,.28);background:rgba(214,163,58,.07);border-radius:9px}.human-lock i{width:8px;height:8px;margin-top:3px;border-radius:50%;background:var(--gold);box-shadow:0 0 13px rgba(214,163,58,.6)}.human-lock span{font-size:12px;line-height:1.5;color:#d7c8a7}
  .primary{border:0;border-radius:9px;background:linear-gradient(135deg,var(--accent),#7c66ee);color:#fff;padding:12px 16px;font:800 13px Inter,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(97,84,223,.22)}.primary:hover{transform:translateY(-1px);box-shadow:0 10px 30px rgba(97,84,223,.32)}.primary:disabled{opacity:.3;cursor:not-allowed;transform:none}.primary.complete{background:#15845e}
  .quiz-room{display:grid;grid-template-columns:minmax(300px,.82fr) minmax(0,1.18fr);min-height:590px}.quiz-brief{padding:42px;border-right:1px solid rgba(148,163,184,.16);background:linear-gradient(160deg,rgba(97,84,223,.09),transparent 56%)}.quiz-brief h2{font-size:clamp(27px,3vw,42px);line-height:1.08;letter-spacing:-.045em;margin:14px 0 16px}.quiz-brief>p{font-size:14px;line-height:1.6;color:#96a3b7}.stakes{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}.stakes span{padding:8px 10px;border:1px solid rgba(148,163,184,.18);border-radius:8px;background:rgba(15,23,42,.64);font-size:12px;color:#8492a7}.stakes b{color:#fff}.options{padding:34px 38px;display:flex;flex-direction:column;justify-content:center;gap:11px}.options button{display:grid;grid-template-columns:48px 1fr;align-items:center;text-align:left;border:1px solid rgba(148,163,184,.18);background:rgba(15,23,42,.62);color:#cbd5e1;border-radius:11px;overflow:hidden;cursor:pointer;transition:.16s;min-height:56px}.options button:hover,.options button.selected{border-color:var(--accent-soft);background:rgba(97,84,223,.12);transform:translateX(3px)}.options button.right{border-color:#31b989;background:rgba(49,185,137,.1)}.options button.wrong{border-color:var(--danger);background:rgba(200,69,95,.1)}.letter{height:100%;display:grid;place-items:center;border-right:1px solid rgba(148,163,184,.16);font-size:12px;font-weight:800;color:var(--accent-soft)}.option-copy{padding:16px;font-size:14px;line-height:1.45}
  .recall-room{display:grid;grid-template-columns:minmax(340px,.94fr) minmax(0,1.06fr);min-height:590px}.brief{padding:34px 36px;border-right:1px solid rgba(148,163,184,.16);background:linear-gradient(160deg,rgba(97,84,223,.09),transparent 54%)}.brief h2{font-size:clamp(26px,2.9vw,38px);line-height:1.11;letter-spacing:-.04em;margin:11px 0}.room-rule{font-size:13px;line-height:1.55;color:#7f8da2;margin:0 0 16px}.intel{margin-top:11px;padding:11px;border:1px solid rgba(148,163,184,.17);background:rgba(7,12,22,.42);border-radius:10px}.intel>span{display:block;font-size:12px;letter-spacing:.1em;color:#7f8ba0;font-weight:800}.intel p{font-size:12px;line-height:1.55;color:#b4becd;margin:6px 0 0}.answer-panel{padding:28px 30px;display:flex;flex-direction:column}.answer-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.answer-heading span{font-size:12px;letter-spacing:.12em;color:var(--accent-soft);font-weight:800}.answer-heading small{font-size:12px;color:#738096}.answer-panel textarea{flex:1;min-height:330px;width:100%;resize:none;border:1px solid rgba(148,163,184,.2);background:rgba(5,9,17,.68);border-radius:12px;color:#f1f5f9;padding:18px;font:12px/1.7 Inter,sans-serif;outline:none}.answer-panel textarea:focus{border-color:var(--accent-soft);box-shadow:0 0 0 3px rgba(97,84,223,.11),0 16px 40px rgba(0,0,0,.18)}.answer-footer{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:10px}.answer-footer>span{font-size:12px;color:#718096}.feedback{margin-top:11px;padding:11px 12px;border:1px solid rgba(49,185,137,.32);background:rgba(49,185,137,.08);border-radius:9px;color:#8de0bd;font-size:12px;line-height:1.5}.feedback.negative{border-color:rgba(200,69,95,.4);background:rgba(200,69,95,.08);color:#ffa4b5}
  .belief-ambient{position:absolute;left:0;right:0;bottom:0;height:4px;background:linear-gradient(90deg,#c8455f 0%,#d6a33a 42%,var(--accent-soft) var(--belief),rgba(51,65,85,.4) var(--belief));box-shadow:0 -10px 30px rgba(97,84,223,.13)}
  .cognition-check{display:flex;align-items:center;gap:7px;width:max-content;margin-top:9px;padding:5px 8px;border:1px solid rgba(145,134,239,.28);border-radius:999px;background:rgba(97,84,223,.08)}.cognition-check i{width:6px;height:6px;border-radius:50%;background:#9a8df6;box-shadow:0 0 10px rgba(154,141,246,.55)}.cognition-check span{font-size:12px;letter-spacing:.13em;color:#7f8ba0;font-weight:850}.cognition-check b{font-size:12px;color:#c1bbff;text-transform:uppercase;letter-spacing:.05em}.blind-check{margin:11px 0 0;padding:10px 11px;border:1px solid rgba(145,134,239,.22);border-left:3px solid #9186ef;border-radius:9px;background:rgba(97,84,223,.07)}.blind-check span{display:block;font-size:12px;letter-spacing:.12em;color:#a9a0ff;font-weight:850}.blind-check p{margin:5px 0 0;font-size:12px;line-height:1.5;color:#9aa7bb}

  .chain-room,.dialogue-room,.case-room{display:grid;grid-template-columns:minmax(360px,.82fr) minmax(0,1.18fr);min-height:610px}.chain-builder,.dialogue-response,.systems-board{padding:30px 34px;display:flex;flex-direction:column}.chain-stack{display:flex;flex-direction:column;gap:5px;flex:1}.chain-step{position:relative;display:grid;grid-template-columns:42px minmax(145px,.52fr) 1fr 26px;align-items:center;gap:12px;padding:13px 14px;border:1px solid rgba(148,163,184,.18);border-radius:14px;background:linear-gradient(145deg,rgba(9,14,26,.84),rgba(12,18,32,.56));transition:.18s}.chain-step.complete{border-color:rgba(49,185,137,.32);background:linear-gradient(145deg,rgba(10,31,29,.56),rgba(9,15,26,.72))}.chain-index{width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(145,134,239,.34);border-radius:10px;color:#b9b2ff;font-weight:850;font-size:12px}.chain-copy b,.chain-copy small{display:block}.chain-copy b{font-size:14px;color:#eef2ff}.chain-copy small{margin-top:3px;font-size:12px;color:#8794a8}.chain-step textarea{width:100%;min-height:52px;resize:none;border:0;background:transparent;color:#f8fafc;padding:4px 2px;font:14px/1.5 Inter,system-ui,sans-serif;outline:none}.chain-step textarea::placeholder{color:#586679}.chain-state{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:rgba(97,84,223,.1);color:#756ae1;font-style:normal}.chain-step.complete .chain-state{background:rgba(49,185,137,.14);color:#55d3a5}.chain-arrow{height:10px;display:grid;place-items:center;color:#7468e4;font-style:normal;font-size:15px}.strike-panel{margin-top:18px;padding:13px 14px;border:1px solid rgba(239,174,68,.3);background:rgba(239,174,68,.07);border-radius:10px}.strike-panel>span,.strike-panel>b{display:block}.strike-panel>span{font-size:12px;letter-spacing:.1em;color:#f0b45d;font-weight:850}.strike-panel>b{margin-top:5px;font-size:24px}.strike-panel p{margin:4px 0 0;font-size:13px;line-height:1.45;color:#a9b3c2}.strike-panel.danger{border-color:rgba(239,71,111,.35);background:rgba(239,71,111,.07)}.strike-panel.danger>span{color:#ff8da8}
  .opponent-panel,.case-brief{padding:36px;border-right:1px solid rgba(148,163,184,.16);background:linear-gradient(160deg,rgba(97,84,223,.1),transparent 58%)}.dialogue-topline{display:flex;align-items:center;justify-content:space-between}.turn-meter{display:flex;align-items:center;gap:10px;color:#99a6ba;font-size:13px}.turn-meter span{color:#b8b1ff;font-weight:800}.opponent-message{display:grid;grid-template-columns:58px 1fr;gap:14px;align-items:start;margin-top:24px}.opponent-message img{width:56px;height:56px;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(97,84,223,.25))}.opponent-message>div>span{font-size:12px;letter-spacing:.12em;color:#8f86f3;font-weight:850}.opponent-panel blockquote{margin:8px 0 0;padding:18px 20px;border:1px solid rgba(145,134,239,.22);border-left:3px solid #9186ef;border-radius:0 13px 13px 13px;background:linear-gradient(145deg,rgba(26,30,56,.72),rgba(7,12,22,.45));font-size:24px;line-height:1.28;font-weight:760;letter-spacing:-.025em}.dialogue-log{display:grid;gap:8px;margin-top:16px}.dialogue-log div{padding:10px 12px;border:1px solid rgba(49,185,137,.2);border-radius:9px;background:rgba(49,185,137,.06)}.dialogue-log span{font-size:12px;letter-spacing:.08em;color:#75d6b2;font-weight:800}.dialogue-log p{margin:5px 0 0;font-size:13px;line-height:1.45;color:#c9d2de}.composer-shell{display:flex;flex-direction:column;flex:1;min-height:390px;border:1px solid rgba(148,163,184,.18);border-radius:16px;background:linear-gradient(145deg,rgba(6,10,19,.88),rgba(10,15,28,.72));box-shadow:inset 0 1px rgba(255,255,255,.025),0 20px 50px rgba(0,0,0,.18)}.composer-head,.composer-foot{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;color:#79869a;font-size:12px}.composer-head{border-bottom:1px solid rgba(148,163,184,.12)}.composer-head span{letter-spacing:.11em;color:#a69eff;font-weight:850}.composer-foot{border-top:1px solid rgba(148,163,184,.1)}.composer-foot kbd{padding:3px 7px;border:1px solid rgba(148,163,184,.16);border-radius:6px;background:#111827;color:#8894a7;font:12px Inter,system-ui,sans-serif}.dialogue-response textarea{flex:1;min-height:260px;border:0;background:transparent;color:#f1f5f9;padding:20px;font:15px/1.7 Inter,system-ui,sans-serif;resize:none;outline:none}.dialogue-submit{align-self:flex-end;margin-top:12px;min-width:220px}
  .case-brief h2{font-size:clamp(25px,2.6vw,36px);line-height:1.12;margin:12px 0 14px}.case-brief>p{font-size:14px;line-height:1.6;color:#9ba8ba}.system-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:14px}.system-tabs button{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:7px;min-width:0;padding:10px;border:1px solid rgba(148,163,184,.16);border-radius:10px;background:rgba(7,12,22,.5);color:#8d99ab;cursor:pointer}.system-tabs button span{font-size:12px;color:#6f7c90}.system-tabs button b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;font-size:12px}.system-tabs button i{font-style:normal;color:#59677b}.system-tabs button.active{border-color:#9186ef;background:rgba(97,84,223,.12);color:#fff;box-shadow:0 0 0 2px rgba(97,84,223,.08)}.system-tabs button.complete i{color:#53d2a1}.system-focus{display:flex;flex-direction:column;flex:1;padding:22px;border:1px solid rgba(148,163,184,.17);border-radius:16px;background:linear-gradient(145deg,rgba(7,12,22,.82),rgba(13,18,32,.62));box-shadow:inset 0 1px rgba(255,255,255,.02)}.system-focus-label{display:flex;align-items:center;gap:12px}.system-focus-label span{font-size:12px;letter-spacing:.12em;color:#7d899d}.system-focus-label b{font-size:14px;color:#bcb5ff}.system-focus h3{margin:12px 0 14px;font-size:23px;line-height:1.18;letter-spacing:-.025em}.system-focus textarea{flex:1;min-height:210px;resize:none;border:0;border-radius:12px;background:#070b14;color:#f8fafc;padding:18px;font:15px/1.65 Inter,system-ui,sans-serif;outline:none;box-shadow:inset 0 0 0 1px rgba(148,163,184,.15)}.system-focus textarea:focus{box-shadow:inset 0 0 0 1px #9186ef,0 0 0 3px rgba(97,84,223,.08)}.system-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px}.ghost{border:1px solid rgba(148,163,184,.17);background:#0d1422;color:#9aa7ba;border-radius:9px;padding:11px 14px;font-size:13px;font-weight:750;cursor:pointer}.ghost:disabled{opacity:.3;cursor:not-allowed}

  @media(max-width:960px){.cinema,.quiz-room,.recall-room,.chain-room,.dialogue-room,.case-room{grid-template-columns:1fr}.mission-brief,.quiz-brief,.brief{border-left:0;border-right:0;border-top:1px solid rgba(148,163,184,.16)}.frame-wrap{order:1}.mission-brief{order:2}.room-identity{grid-template-columns:auto 1fr}.belief-chip{display:none}.recall-room{min-height:auto}.answer-panel textarea{min-height:280px}}
  @media(max-width:620px){.encounter{padding:18px 12px 40px}.room-identity{margin:12px 0 17px}.badge-wrap{width:64px;height:64px}.identity-copy h1{font-size:32px}.cinema,.quiz-room,.recall-room,.chain-room,.dialogue-room,.case-room{border-radius:12px}.mission-brief,.quiz-brief,.brief,.answer-panel,.options{padding:22px}.frame-wrap{padding:10px}.answer-panel textarea{min-height:240px}.answer-footer{align-items:flex-start;flex-direction:column}.answer-footer .primary{width:100%}}
</style>
