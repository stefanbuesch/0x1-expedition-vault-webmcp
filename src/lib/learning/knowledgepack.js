// @ts-nocheck
export const MOTOR_SYSTEMS_PACK = {
  id: 'motor-systems-001',
  title: 'Motor Systems // Induction Vault',
  seed: '0x9F2A',
  goal: 'I have an electric-motor interview on Friday. I know calculus but not electromagnetism. Make me ready — and make me prove it.',
  threshold: 45,
  rooms: [
    {
      refId: 'field-lines', title: 'Field Lines', subtitle: 'The geometry of force', nodeType: 'video', status: 'available',
      mastery: 72, beliefDelta: 4, glyph: 'Φ',
      edges: [{ targetRefId: 'faraday', type: 'NEXT' }],
      part: {
        type: 'video', title: 'Electric motors: field, force, torque',
        videoUrl: 'https://www.youtube.com/embed/pAgPfr7MkkU?rel=0',
        sourceLabel: 'Khan Academy · Electric motors (part 1)',
        prompt: 'Watch for the causal link between current, magnetic field, force, and torque.'
      }
    },
    {
      refId: 'faraday', title: 'Faraday Induction', subtitle: 'Motion writes voltage', nodeType: 'quiz', status: 'locked',
      mastery: 38, beliefDelta: 6, glyph: '∂',
      edges: [
        { targetRefId: 'back-emf', type: 'NEXT' },
        { targetRefId: 'lenz-law', type: 'OPTION' }
      ],
      part: {
        type: 'quiz', question: 'A loop experiences a faster change in magnetic flux. What happens to induced EMF, all else equal?',
        options: ['It decreases', 'It increases', 'It stays fixed', 'It becomes zero'], correctIndex: 1,
        explanation: 'Faraday’s law ties induced EMF to the rate of change of magnetic flux, so a faster flux change produces a larger induced EMF.'
      }
    },
    {
      refId: 'back-emf', title: 'Back-EMF', subtitle: 'The motor fights back', nodeType: 'recall', status: 'locked',
      mastery: 21, beliefDelta: 9, glyph: '↯',
      edges: [
        { targetRefId: 'motor-load', type: 'GATE' },
        { targetRefId: 'lenz-law', type: 'BRANCH' }
      ],
      part: {
        type: 'recall',
        question: 'A DC motor is spinning at steady supply voltage. The shaft is suddenly loaded and slows. Explain the causal chain from speed → back-EMF → armature current → torque.',
        expected: ['speed falls', 'back-emf falls', 'current rises', 'torque rises'],
        hint: 'Anchor every arrow. Do not merely state that current rises; explain why the opposing induced voltage changes first.'
      }
    },
    {
      refId: 'lenz-law', title: "Lenz's Law", subtitle: 'Opposition has a direction', nodeType: 'dialogue', status: 'locked',
      mastery: 18, beliefDelta: 8, glyph: '↺',
      edges: [{ targetRefId: 'motor-load', type: 'GATE' }],
      part: {
        type: 'dialogue',
        question: 'I claim the induced current helps the magnetic-flux change that created it. Refute me in two steps.',
        probes: ['What would happen to energy conservation if induction reinforced the change?', 'Apply the direction rule to the motor’s back-EMF.']
      }
    },
    {
      refId: 'motor-load', title: 'Motor Under Load', subtitle: 'Boss: causal systems test', nodeType: 'boss', status: 'locked',
      mastery: 8, beliefDelta: 14, glyph: '⚙',
      edges: [{ targetRefId: 'commutation', type: 'NEXT' }],
      part: {
        type: 'case-study',
        question: 'BOSS CASE // A conveyor motor runs unloaded, then receives a sudden mechanical load. Predict the immediate and settling behavior of speed, back-EMF, current, torque, and electrical power. Identify one failure mode if the shaft remains stalled.',
        checklist: ['speed response', 'back-EMF response', 'current response', 'torque response', 'power/thermal consequence']
      }
    },
    {
      refId: 'commutation', title: 'Commutation', subtitle: 'Unlocked after the boss', nodeType: 'video', status: 'locked',
      mastery: 0, beliefDelta: 5, glyph: '◇',
      edges: [],
      part: {
        type: 'video', title: 'Commutation: keeping torque in one direction',
        videoUrl: 'https://www.youtube.com/embed/XMkUDyl1ZRo?rel=0',
        sourceLabel: 'Khan Academy · Electric motors (part 3)',
        prompt: 'Focus on why current direction must reverse every half-turn.'
      }
    }
  ]
};

export function cloneKnowledgePack(pack = MOTOR_SYSTEMS_PACK) {
  return structuredClone(pack);
}
