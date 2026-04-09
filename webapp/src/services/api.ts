import { useStorage } from '@vueuse/core'
import type { BitwiseResponse } from '../types/bitwise'

export const STORAGE_KEYS = {
  API_BASE_URL: 'bitwise_api_base_url',
  API_KEY: 'bitwise_api_key',
  MODEL_NAME: 'bitwise_model_name',
  USER_LANGUAGE: 'bitwise_user_language'
} as const

const SYSTEM_PROMPTS = {
  en: `You are a bitwise operations expert. Analyze the expression and return a JSON response matching this exact interface:

interface Operand {
  name: string;
  decimal: number;
  binary: string;
}

interface OperationStep {
  step_id: number;
  operation_name: string;
  expression_part: string;
  explanation: string;
  rule_citation: string;
  operands: Operand[];
  result: Operand;
  highlight_bits: number[];
}

interface BitwiseResponse {
  expression: string;
  ast_nodes: string[];
  steps: OperationStep[];
}

Return ONLY valid JSON. No markdown, no explanations outside the JSON structure.
IMPORTANT: All text fields (operation_name, explanation, rule_citation) must be in ENGLISH.`,

  zh: `You are a bitwise operations expert. Analyze the expression and return a JSON response matching this exact interface:

interface Operand {
  name: string;
  decimal: number;
  binary: string;
}

interface OperationStep {
  step_id: number;
  operation_name: string;
  expression_part: string;
  explanation: string;
  rule_citation: string;
  operands: Operand[];
  result: Operand;
  highlight_bits: number[];
}

interface BitwiseResponse {
  expression: string;
  ast_nodes: string[];
  steps: OperationStep[];
}

Return ONLY valid JSON. No markdown, no explanations outside the JSON structure.
IMPORTANT: All text fields (operation_name, explanation, rule_citation) must be in SIMPLIFIED CHINESE.`
} as const

export interface ApiConfig {
  apiBaseURL: string
  apiKey: string
}

export interface ApiError {
  message: string
  status?: number
}

export interface SendBitwiseRequestOptions {
  language?: 'en' | 'zh'
  debug?: boolean
  useProxy?: boolean
  retryCount?: number
}

function getStoredConfig(): ApiConfig {
  const apiBaseURL = useStorage<string>(STORAGE_KEYS.API_BASE_URL, 'https://api.openai.com/v1')
  const apiKey = useStorage<string>(STORAGE_KEYS.API_KEY, '')
  
  return {
    apiBaseURL: apiBaseURL.value,
    apiKey: apiKey.value
  }
}

function getUserLanguage(): 'en' | 'zh' {
  const lang = useStorage<string>(STORAGE_KEYS.USER_LANGUAGE, 'zh')
  return lang.value === 'zh' ? 'zh' : 'en'
}

function log(...args: any[]) {
  const timestamp = new Date().toISOString().slice(11, 23)
  console.log(`\x1b[36m[Bitwise HUD ${timestamp}]\x1b[0m`, ...args)
}

function logError(...args: any[]) {
  const timestamp = new Date().toISOString().slice(11, 23)
  console.error(`\x1b[31m[Bitwise HUD ${timestamp}]\x1b[0m`, ...args)
}

function validateResponse(data: unknown): data is BitwiseResponse {
  if (typeof data !== 'object' || data === null) return false
  
  const response = data as Record<string, unknown>
  if (!('expression' in response) || typeof response.expression !== 'string') return false
  if (!('ast_nodes' in response) || !Array.isArray(response.ast_nodes)) return false
  if (!('steps' in response) || !Array.isArray(response.steps)) return false
  
  for (const step of response.steps) {
    if (typeof step !== 'object' || step === null) return false
    const s = step as Record<string, unknown>
    if (typeof s.step_id !== 'number') return false
    if (typeof s.operation_name !== 'string') return false
    if (typeof s.expression_part !== 'string') return false
    if (typeof s.explanation !== 'string') return false
    if (typeof s.rule_citation !== 'string') return false
    if (!Array.isArray(s.operands)) return false
    if (typeof s.result !== 'object' || s.result === null) return false
    if (!Array.isArray(s.highlight_bits)) return false
  }
  
  return true
}

export async function sendBitwiseRequest(
  expression: string,
  x: number,
  y: number,
  options?: SendBitwiseRequestOptions
): Promise<BitwiseResponse> {
  const startTime = Date.now()
  const debug = options?.debug ?? true
  const useProxy = options?.useProxy ?? true
  const maxRetries = options?.retryCount ?? 2
  const config = getStoredConfig()
  const userLang = options?.language || getUserLanguage()
  
  if (debug) {
    log('═══════════════════════════════════════════════════════════')
    log('🔧 Bitwise Operation Analysis')
    log('═══════════════════════════════════════════════════════════')
    log('Expression:', expression)
    log('Operand X:', x, `(binary: ${(x >>> 0).toString(2).padStart(32, '0')})`)
    log('Operand Y:', y, `(binary: ${(y >>> 0).toString(2).padStart(32, '0')})`)
    log('Language:', userLang === 'zh' ? '中文' : 'English')
    log('═══════════════════════════════════════════════════════════')
  }
  
  if (!config.apiKey) {
    throw new Error('API key is not configured')
  }
  
  if (!config.apiBaseURL) {
    throw new Error('API Base URL is not configured')
  }

  const baseUrl = useProxy && import.meta.env.DEV ? '/api/v1' : config.apiBaseURL
  const model = useStorage<string>(STORAGE_KEYS.MODEL_NAME, 'gpt-4o-mini').value
  
  const systemPrompt = SYSTEM_PROMPTS[userLang]
  const userPrompt = userLang === 'zh' 
    ? `请分析以下位运算表达式：

表达式：${expression}
操作数 X: ${x}
操作数 Y: ${y}

请提供位运算的逐步推演过程。`
    : `Analyze the following bitwise expression:

Expression: ${expression}
Operand X: ${x}
Operand Y: ${y}

Provide a step-by-step breakdown.`

  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0,
    response_format: { type: 'json_object' }
  }
  
  let lastError: Error | null = null
  let attempts = 0
  
  while (attempts <= maxRetries) {
    try {
      if (attempts > 0) {
        const waitTime = Math.pow(2, attempts + 1) * 1000
        log(`⏳ Retry ${attempts}/${maxRetries}, waiting ${waitTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
      
      log('📤 Sending request to:', `${baseUrl}/chat/completions`)
      
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      })
      
      const responseTime = Date.now() - startTime
      log('📡 Response:', response.status, response.ok ? '✓' : '✗', `(${responseTime}ms)`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`
        
        // 429 错误触发重试
        if (response.status === 429) {
          lastError = new Error(`Rate limit exceeded (429). ${errorMessage}`)
          if (attempts < maxRetries) {
            log('⚠️ Rate limited, will retry...')
            attempts++
            continue
          }
        }
        
        throw new Error(errorMessage)
      }
      
      const responseData = await response.json()
      
      if (!responseData.choices?.[0]?.message?.content) {
        throw new Error('Invalid response: missing content')
      }
      
      let content = responseData.choices[0].message.content
      
      // 清理 Markdown 标记
      if (typeof content === 'string') {
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        if (content.startsWith('```')) content = content.slice(3)
        if (content.endsWith('```')) content = content.slice(0, -3)
        content = content.trim()
      }
      
      const parsedResponse = JSON.parse(content)
      
      if (!validateResponse(parsedResponse)) {
        throw new Error('Invalid response structure')
      }
      
      log('✅ Success! Steps:', parsedResponse.steps.length)
      return parsedResponse
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (error instanceof Error && error.message.includes('429')) {
        attempts++
        continue
      }
      
      logError('❌ Error:', error instanceof Error ? error.message : error)
      throw error
    }
  }
  
  throw lastError || new Error('Request failed after all retries')
}

export function setApiConfig(config: ApiConfig): void {
  const apiBaseURL = useStorage<string>(STORAGE_KEYS.API_BASE_URL, config.apiBaseURL)
  const apiKey = useStorage<string>(STORAGE_KEYS.API_KEY, config.apiKey)
  apiBaseURL.value = config.apiBaseURL
  apiKey.value = config.apiKey
}

export function setUserLanguage(language: 'en' | 'zh'): void {
  const lang = useStorage<string>(STORAGE_KEYS.USER_LANGUAGE, language)
  lang.value = language
}

export function getApiStorageKeys(): typeof STORAGE_KEYS {
  return STORAGE_KEYS
}
