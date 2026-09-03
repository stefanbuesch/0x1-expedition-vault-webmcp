// @ts-nocheck
function result(text, structuredContent) {
  return { content: [{ type: 'text', text }], structuredContent };
}

function modelContext() {
  if (typeof document === 'undefined') return null;
  return document.modelContext || globalThis.navigator?.modelContext || null;
}

export function createLearningWebMCP({ getState, actions, onActivity }) {
  let controller;
  let registeredContext = null;
  let registeredSignature = '';
  let registeredTools = [];
  const supported = () => Boolean(modelContext()?.registerTool);

  async function sync() {
    const mc = modelContext();
    if (!mc?.registerTool) {
      controller?.abort();
      controller = undefined;
      registeredContext = null;
      registeredSignature = '';
      registeredTools = [];
      return { supported: false, tools: [] };
    }

    const state = getState();
    const modules = state.modules || [];
    const signature = `${state.packId || ''}:${modules.map((module) => module.id).join('|')}`;
    if (registeredContext === mc && registeredSignature === signature && registeredTools.length) {
      return { supported: true, tools: registeredTools };
    }

    controller?.abort();
    controller = new AbortController();
    const names = [];
    const add = async (tool) => {
      names.push(tool.name);
      await mc.registerTool(tool, { signal: controller.signal });
    };

    await add({
      name: 'ingest_learning_material',
      description: 'Create and immediately launch a new interactive course from any topic, optional YouTube/source URL, and/or pasted text material.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Topic or course title. May be used by itself.' },
          url: { type: 'string', description: 'Optional YouTube or source URL.' },
          content: { type: 'string', description: 'Optional transcript, notes, article text, markdown, or extracted text.' }
        },
        additionalProperties: false
      },
      annotations: { readOnlyHint: false },
      execute: async ({ title = '', url = '', content = '' } = {}) => {
        if (![title, url, content].some((value) => String(value).trim())) {
          return result('Provide at least a topic, URL, or text material.', { success: false, reason: 'empty_input' });
        }
        const outcome = await actions.ingest({ title, url, content });
        onActivity?.('ingest_learning_material', { title, url, contentLength: content.length }, outcome.summary || `Created ${outcome.modules} modules`, 'state');
        return result(outcome.summary || `Created and launched “${outcome.title}”.`, outcome);
      }
    });

    await add({
      name: 'explore_module',
      description: 'Open and inspect one currently available module in the visible course. Locked prerequisite gates cannot be bypassed.',
      inputSchema: {
        type: 'object',
        properties: { module_id: { type: 'string', enum: modules.map((module) => module.id) } },
        required: ['module_id'], additionalProperties: false
      },
      annotations: { readOnlyHint: false },
      execute: async ({ module_id }) => {
        const outcome = actions.exploreModule(module_id);
        onActivity?.('explore_module', module_id, outcome.summary || `Opened ${outcome.title}`, 'state');
        return result(outcome.summary || `Opened ${outcome.title}.`, outcome);
      }
    });

    await add({
      name: 'submit_solution',
      description: 'Submit an answer to a quiz, causal recall challenge, transfer task, or mastery defense using the same checkpoint validation as the visible expedition. Locked rooms and human-only source-video checkpoints return structured refusals rather than bypassing gates.',
      inputSchema: {
        type: 'object',
        properties: {
          module_id: { type: 'string', enum: modules.map((module) => module.id) },
          solution: { type: 'string', minLength: 1 }
        },
        required: ['module_id', 'solution'], additionalProperties: false
      },
      annotations: { readOnlyHint: false },
      execute: async ({ module_id, solution }) => {
        const outcome = actions.submitSolution(module_id, solution);
        onActivity?.('submit_solution', { module_id, solution: solution.slice(0, 96) }, outcome.summary, 'state');
        return result(outcome.summary, outcome);
      }
    });

    await add({
      name: 'inspect_progress',
      description: 'Read the current course mastery, completion percentage, active module, source concepts, and recent belief trajectory.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: async () => {
        const progress = actions.inspectProgress();
        onActivity?.('inspect_progress', 'current course', `Mastery ${progress.masteryScore}% · ${progress.progress}% complete`, 'read');
        return result('Current course progress inspected.', progress);
      }
    });

    let exposed = names;
    if (mc.getTools) {
      try {
        const registered = await mc.getTools();
        const visible = new Set((registered || []).map((tool) => tool?.name).filter(Boolean));
        const confirmed = names.filter((name) => visible.has(name));
        if (confirmed.length) exposed = confirmed;
      } catch {
        // Browser agents can still discover registered tools if in-page enumeration is unavailable.
      }
    }
    registeredContext = mc;
    registeredSignature = signature;
    registeredTools = exposed;
    return { supported: true, tools: exposed };
  }

  return {
    sync,
    supported,
    destroy: () => {
      controller?.abort();
      controller = undefined;
      registeredContext = null;
      registeredSignature = '';
      registeredTools = [];
    }
  };
}
