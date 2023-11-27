import type { ModelName } from './types'

export * from './types'

const modelContextSizeMap = new Map<ModelName, number>([
  ['gpt-3.5-turbo-16k', 16384],
  ['gpt-3.5-turbo', 4096],
  ['gpt-4-1106-preview', 128000],
  ['gpt-4-32k', 32768],
  ['gpt-4', 8192],
  ['text-davinci-003', 4097],
  ['text-curie-001', 2048],
  ['text-babbage-001', 2048],
  ['text-ada-001', 2048],
  ['code-davinci-002', 8000],
  ['code-cushman-001', 2048],
])

/**
 * Resolve a model name to a canonical model name.
 */
export function resolveModelName(modelName: string): ModelName {
  if (modelName.startsWith('gpt-3.5-turbo-16k'))
    return 'gpt-3.5-turbo-16k'

  if (modelName.startsWith('gpt-3.5-turbo-'))
    return 'gpt-3.5-turbo'

  if (modelName.startsWith('gpt-4-32k'))
    return 'gpt-4-32k'

  if (modelName.startsWith('gpt-4-'))
    return 'gpt-4'

  return modelName as ModelName
}

/**
 * Returns the maximum number of tokens that can be generated by the model.
 */
export function getModelContextSize(modelName: string): number {
  const modelKey = resolveModelName(modelName)
  return modelContextSizeMap.get(modelKey) ?? 4097
}

export function getEmbeddingContextSize(modelName?: string): number {
  if (modelName === 'text-embedding-ada-002')
    return 8191

  return 2046
}

const WHITESPACE_RE = /^\s+$/
// Include alphanumeric and accented characters
const ALPHANUMERIC_RE = /^[a-zA-Z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]+$/
const PUNCTUATION_RE = /[.,!?;'"„“”‘’\-(){}[\]<>:/\\|@#$%^&*+=`~]/

/**
 * Estimate the number of tokens in a string.
 */
export function approximateTokenSize(input: string) {
  // Split by whitespace, punctuation, and other special characters
  const roughTokens = input
    .split(/(\s+|[.,!?;'"„“”‘’\-(){}[\]<>:/\\|@#$%^&*+=`~]+)/)
    .filter(Boolean)

  let tokenCount = 0
  for (const token of roughTokens) {
    if (WHITESPACE_RE.test(token)) {
      // Don't count whitespace as a token
      continue
    }
    else if (token.length <= 3) {
      // Short tokens are often a single token
      tokenCount += 1
    }
    else if (ALPHANUMERIC_RE.test(token)) {
      // Increase the average token length for alphanumeric strings
      tokenCount += Math.ceil(token.length / 4)
    }
    else if (PUNCTUATION_RE.test(token)) {
      // Punctuation is often a single token, but multiple punctuations are often split
      tokenCount += Math.ceil(token.length / 2)
    }
    else {
      // For other characters (like emojis or special characters), count each as a token
      tokenCount += Array.from(token).length
    }
  }

  return tokenCount
}

/**
 * Returns the maximum number of tokens that can be generated by the model.
 */
export function approximateMaxTokenSize({
  prompt,
  modelName,
  maxTokensInResponse = 0,
}: {
  prompt: string
  modelName: ModelName
  /** The maximum number of tokens to generate in the reply. 1000 tokens are roughly 750 English words. */
  maxTokensInResponse?: number
}) {
  // Ensure that the sum of the prompt tokens and the response tokens
  // doesn't exceed the model's limit
  const remainingTokens
  = getModelContextSize(modelName)
  // Not using GPT tokenizer here because it will explode the bundle size
  - approximateTokenSize(prompt)
  - maxTokensInResponse

  return Math.max(0, remainingTokens)
}

/**
 * Ensures that the input string is within the token limit.
 */
export function isWithinTokenLimit(input: string, tokenLimit: number) {
  return approximateTokenSize(input) <= tokenLimit
}