// AI classification behind a service interface. The model, provider,
// and client-vs-server location can all change without the UI knowing.
//
// This service is an ENHANCEMENT, never a gate: it is only ever invoked
// after the dump is already persisted locally, and every failure mode
// (no key, offline, API down, garbage output) simply leaves the item in
// the Inbox untriaged. Nothing here can lose a capture.

import Anthropic from '@anthropic-ai/sdk'
import { getSetting } from './settings'
import type { ItemType, Priority } from '../types'

export interface ClassificationSuggestion {
  type: ItemType
  title: string | null
  tags: string[]
  priority: Priority | null
  dueDate: number | null
  /** cleaned-up note body; rawText is preserved separately regardless */
  body: string | null
}

export interface ClassificationService {
  /** false = not configured (e.g. no API key); callers just skip AI */
  available(): boolean
  classify(rawText: string, knownTags: string[]): Promise<ClassificationSuggestion>
}

// A small, fast, cheap model — this is a few sentences in, JSON out,
// fractions of a cent per dump.
const MODEL = 'claude-haiku-4-5'

const CLASSIFY_TOOL: Anthropic.Tool = {
  name: 'record_classification',
  description: 'Record the classification of a captured thought.',
  input_schema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['task', 'note'],
        description:
          'task = actionable, something to do; note = reference, idea, or information to keep',
      },
      suggestedTitle: {
        type: 'string',
        description: 'Short clear title (max ~8 words). Omit if the text is already short.',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: '0-3 lowercase tags. Strongly prefer the existing tags provided.',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Only for tasks, and only when urgency is implied by the text.',
      },
      dueDate: {
        type: 'string',
        description:
          'Only when the text implies a date or deadline: ISO local datetime like 2026-07-08T09:00. Resolve relative phrases ("next Tuesday") against the current datetime given.',
      },
      cleanedBody: {
        type: 'string',
        description:
          'For notes: the thought with filler words removed and obvious dictation errors fixed. Keep the meaning; do not add content.',
      },
    },
    required: ['type'],
  },
}

class AnthropicClassifier implements ClassificationService {
  available(): boolean {
    return !!getSetting('anthropicApiKey')
  }

  async classify(rawText: string, knownTags: string[]): Promise<ClassificationSuggestion> {
    // v1 is single-user on the owner's own device with their own key
    // (see settings.ts security note) — dangerouslyAllowBrowser is why
    // this must move behind a backend before the app is ever shared.
    const client = new Anthropic({
      apiKey: getSetting('anthropicApiKey'),
      dangerouslyAllowBrowser: true,
    })
    const now = new Date()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: `You classify raw "brain dump" captures for a personal task/notes app.
Current datetime: ${now.toString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone}).
Existing tags: ${knownTags.join(', ') || '(none)'}.
Classify the user's capture with the record_classification tool. Be conservative: suggest only what the text supports.`,
      messages: [{ role: 'user', content: rawText }],
      tools: [CLASSIFY_TOOL],
      tool_choice: { type: 'tool', name: 'record_classification' },
    })
    const call = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    )
    if (!call) throw new Error('no classification in response')
    return normalize(call.input as Record<string, unknown>)
  }
}

function normalize(raw: Record<string, unknown>): ClassificationSuggestion {
  const type: ItemType = raw.type === 'task' ? 'task' : 'note'
  const priority =
    type === 'task' && ['low', 'medium', 'high'].includes(raw.priority as string)
      ? (raw.priority as Priority)
      : null
  let dueDate: number | null = null
  if (type === 'task' && typeof raw.dueDate === 'string' && raw.dueDate) {
    const ts = new Date(raw.dueDate).getTime()
    if (!Number.isNaN(ts)) dueDate = ts
  }
  const tags = Array.isArray(raw.tags)
    ? raw.tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 3)
    : []
  return {
    type,
    title:
      typeof raw.suggestedTitle === 'string' && raw.suggestedTitle.trim()
        ? raw.suggestedTitle.trim()
        : null,
    tags,
    priority,
    dueDate,
    body:
      typeof raw.cleanedBody === 'string' && raw.cleanedBody.trim()
        ? raw.cleanedBody.trim()
        : null,
  }
}

export const classifier: ClassificationService = new AnthropicClassifier()
