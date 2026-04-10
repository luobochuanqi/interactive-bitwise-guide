import { ref, computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStorage } from '@vueuse/core'
import type { BitwiseResponse } from '../types/bitwise'
import { mockBitwiseData } from '../data/mock'
import { sendBitwiseRequest, STORAGE_KEYS } from '../services/api'

interface SessionState {
  expression: string
  x: string
  y: string
  isLoading: boolean
  error: string | null
  useMockData: boolean
  apiBaseURL: string
  apiKey: string
  modelName: string
}

interface ExecuteResult {
  success: boolean
  data?: BitwiseResponse
  error?: string
}

export function useBitwiseSession() {
  const { locale, t } = useI18n()

  // 使用 LocalStorage 持久化 API 配置
  const storedApiBaseURL = useStorage<string>(STORAGE_KEYS.API_BASE_URL, '')
  const storedApiKey = useStorage<string>(STORAGE_KEYS.API_KEY, '')
  const storedModelName = useStorage<string>(STORAGE_KEYS.MODEL_NAME, 'gpt-4o-mini')

  const state = reactive<SessionState>({
    expression: 'x*~y+uy*ux==-x',
    x: '42',
    y: '27',
    isLoading: false,
    error: null,
    useMockData: false,
    apiBaseURL: storedApiBaseURL.value,
    apiKey: storedApiKey.value,
    modelName: storedModelName.value
  })

  // 监听 state 变化，同步到 LocalStorage
  watch(() => state.apiBaseURL, (val) => {
    storedApiBaseURL.value = val
  })
  watch(() => state.apiKey, (val) => {
    storedApiKey.value = val
  })
  watch(() => state.modelName, (val) => {
    storedModelName.value = val
  })

  const currentData = ref<BitwiseResponse | null>(null)
  const astNodes = ref<string[]>([])
  const ast = computed(() => currentData.value?.ast || null)
  const currentStepIndex = ref(0)
  const isPlaying = ref(false)

  const isValid = computed(() => {
    return state.expression.trim().length > 0
  })

  const hasData = computed(() => {
    return currentData.value !== null
  })

  const canGoPrevious = computed(() => currentStepIndex.value > 0)
  const canGoNext = computed(() => {
    if (!currentData.value) return false
    return currentStepIndex.value < currentData.value.steps.length - 1
  })

  const currentStep = computed(() => {
    if (!currentData.value) return null
    return currentData.value.steps[currentStepIndex.value] || null
  })

  const totalSteps = computed(() => currentData.value?.steps.length || 0)

  async function executeExpression(): Promise<ExecuteResult> {
    if (!isValid.value) {
      state.error = t('errors.invalidExpression') as string
      return { success: false, error: state.error || undefined }
    }

    state.isLoading = true
    state.error = null
    currentStepIndex.value = 0
    isPlaying.value = false

    try {
      const hasValidApiConfig = state.apiBaseURL.trim().length > 0 && 
                                state.apiKey.trim().length > 0 &&
                                state.modelName.trim().length > 0

      // 调试日志
      console.log('[BitwiseSession] API Config Check:', {
        hasValidApiConfig,
        apiBaseURL: state.apiBaseURL ? '✓ Set' : '✗ Empty',
        apiKey: state.apiKey ? '✓ Set' : '✗ Empty',
        modelName: state.modelName ? `✓ ${state.modelName}` : '✗ Empty',
        useMockData: state.useMockData
      })

      // 自动判断是否使用 Mock 数据：只有当 API 配置完整时才使用真实 API
      const shouldUseMockData = !hasValidApiConfig
      
      if (shouldUseMockData) {
        console.warn('[BitwiseSession] ⚠️ Using MOCK data - API config incomplete')
        await new Promise(resolve => setTimeout(resolve, 800))
        const mockData = {
          ...mockBitwiseData,
          expression: state.expression
        } as BitwiseResponse
        currentData.value = mockData
        astNodes.value = mockData.ast_nodes || []
        state.useMockData = true
        
        console.log('[BitwiseSession] Mock data loaded:', {
          ast: mockData.ast ? '✓ Structured AST' : '✗ No AST',
          astNodes: mockData.ast_nodes?.length || 0,
          steps: mockData.steps.length
        })
        
        return { success: true, data: mockData }
      } else {
        // API 配置完整，使用真实 API
        console.log('[BitwiseSession] ✅ Using REAL API')
        state.useMockData = false
        const currentLang = locale.value === 'zh' ? 'zh' : 'en'
        
        try {
          console.log('[BitwiseSession] 📡 Calling API...')
          const data = await sendBitwiseRequest(
            state.expression,
            parseInt(state.x) || 0,
            parseInt(state.y) || 0,
            { 
              language: currentLang,
              useProxy: false  // 禁用代理，直接请求 ECNU API
            }
          )
          
          console.log('[BitwiseSession] 📥 API response received:', {
            expression: data.expression,
            steps: data.steps.length,
            astNodes: data.ast_nodes?.length || 0,
            ast: data.ast ? '✓ Structured' : '✗ Not provided'
          })
          
          currentData.value = data
          astNodes.value = data.ast_nodes || []
          
          console.log('[BitwiseSession] ✅ Execute successful!')

          return { success: true, data }
        } catch (error) {
          console.error('[BitwiseSession] ❌ API call failed:', error)
          throw error
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (t('errors.unknownError') as string)
      state.error = errorMessage
      return { success: false, error: errorMessage || undefined }
    } finally {
      state.isLoading = false
    }
  }

  function nextStep() {
    if (!canGoNext.value || !currentData.value) return
    currentStepIndex.value++
  }

  function goToPrevious() {
    if (!canGoPrevious.value) return
    currentStepIndex.value--
  }

  function reset() {
    currentStepIndex.value = 0
    isPlaying.value = false
  }

  function togglePlayback() {
    if (isPlaying.value) {
      isPlaying.value = false
    } else if (canGoNext.value) {
      isPlaying.value = true
      const interval = setInterval(() => {
        if (!canGoNext.value) {
          isPlaying.value = false
          clearInterval(interval)
        } else {
          nextStep()
        }
      }, 2000)
    }
  }

  function setExpression(expr: string) {
    state.expression = expr
  }

  function setX(value: string) {
    state.x = value
  }

  function setY(value: string) {
    state.y = value
  }

  function toggleMockMode() {
    state.useMockData = !state.useMockData
  }

  function setApiConfig(baseURL: string, key: string) {
    state.apiBaseURL = baseURL
    state.apiKey = key
  }

  function clearData() {
    currentData.value = null
    astNodes.value = []
    state.error = null
    currentStepIndex.value = 0
  }
  
  function getAst() {
    return ast.value
  }

  function fullReset() {
    clearData()
    state.expression = 'x*~y+uy*ux==-x'
    state.x = '42'
    state.y = '27'
  }

  return {
    state,
    currentData,
    astNodes,
    ast,
    currentStepIndex,
    isPlaying,
    canGoPrevious,
    canGoNext,
    currentStep,
    totalSteps,
    isValid,
    hasData,
    executeExpression,
    nextStep,
    goToPrevious,
    reset,
    togglePlayback,
    setExpression,
    setX,
    setY,
    toggleMockMode,
    setApiConfig,
    clearData,
    fullReset,
    getAst
  }
}
