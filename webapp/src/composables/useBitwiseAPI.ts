import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { sendBitwiseRequest, type ApiConfig } from '../services/api'
import type { BitwiseResponse } from '../types/bitwise'

const STORAGE_KEYS = {
  API_BASE_URL: 'bitwise_api_base_url',
  API_KEY: 'bitwise_api_key'
} as const

export function useBitwiseAPI() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastResponse = ref<BitwiseResponse | null>(null)
  
  const apiBaseURL = useStorage<string>(STORAGE_KEYS.API_BASE_URL, 'https://api.openai.com/v1')
  const apiKey = useStorage<string>(STORAGE_KEYS.API_KEY, '')
  
  const isConfigured = computed(() => apiKey.value.length > 0)
  
  async function sendRequest(expression: string, x: number, y: number): Promise<BitwiseResponse | null> {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await sendBitwiseRequest(expression, x, y)
      lastResponse.value = response
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      error.value = errorMessage
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  function updateConfig(config: ApiConfig): void {
    apiBaseURL.value = config.apiBaseURL
    apiKey.value = config.apiKey
  }
  
  function clearError(): void {
    error.value = null
  }
  
  function clearResponse(): void {
    lastResponse.value = null
  }
  
  function reset(): void {
    isLoading.value = false
    error.value = null
    lastResponse.value = null
  }
  
  return {
    isLoading,
    error,
    lastResponse,
    apiBaseURL,
    apiKey,
    isConfigured,
    sendRequest,
    updateConfig,
    clearError,
    clearResponse,
    reset
  }
}
