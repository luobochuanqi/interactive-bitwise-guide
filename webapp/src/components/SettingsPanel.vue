<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

interface Props {
  open: boolean
  apiBaseURL: string
  apiKey: string
  modelName: string
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'update:apiBaseURL', value: string): void
  (e: 'update:apiKey', value: string): void
  (e: 'update:modelName', value: string): void
  (e: 'test-connection'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()

// 使用本地存储作为默认值 - 使用与 api.ts 一致的 key
const localApiBaseURL = useStorage('bitwise_api_base_url', '')
const localApiKey = useStorage('bitwise_api_key', '')
const localModelName = useStorage('bitwise_model_name', 'gpt-4o-mini')

// 用 computed 实现双向绑定 - 优先使用 props，如果没有则用本地存储
const apiBaseURL = computed({
  get: () => props.apiBaseURL !== undefined && props.apiBaseURL !== '' ? props.apiBaseURL : localApiBaseURL.value,
  set: (value) => {
    localApiBaseURL.value = value
    emit('update:apiBaseURL', value)
  }
})

const apiKey = computed({
  get: () => props.apiKey !== undefined && props.apiKey !== '' ? props.apiKey : localApiKey.value,
  set: (value) => {
    localApiKey.value = value
    emit('update:apiKey', value)
  }
})

const modelName = computed({
  get: () => props.modelName !== undefined && props.modelName !== '' ? props.modelName : localModelName.value,
  set: (value) => {
    localModelName.value = value
    emit('update:modelName', value)
  }
})

// 调试日志：监听值变化
watch([apiBaseURL, apiKey, modelName], ([url, key, model]) => {
  console.log('[SettingsPanel] Config changed:', {
    apiBaseURL: url ? '✓ Set' : '✗ Empty',
    apiKey: key ? '✓ Set' : '✗ Empty',
    modelName: model || '✗ Empty'
  })
}, { immediate: true })

const isTesting = ref(false)
const testStatus = ref<'idle' | 'success' | 'error'>('idle')
const testMessage = ref('')

const isConfigValid = computed(() => {
  return apiBaseURL.value.trim().length > 0 && 
         apiKey.value.trim().length > 0 &&
         modelName.value.trim().length > 0
})

const handleClose = () => {
  emit('update:open', false)
}

const handleTestConnection = async () => {
  if (!isConfigValid.value) {
    testStatus.value = 'error'
    testMessage.value = t('settings.testMissingConfig')
    return
  }

  isTesting.value = true
  testStatus.value = 'idle'
  testMessage.value = ''

  try {
    emit('test-connection')
    testStatus.value = 'success'
    testMessage.value = t('settings.testSuccess')
    
    // 测试成功后延迟关闭
    setTimeout(() => {
      handleClose()
    }, 1500)
  } catch (error) {
    testStatus.value = 'error'
    testMessage.value = error instanceof Error ? error.message : t('settings.testFailed')
  } finally {
    isTesting.value = false
  }
}

// 监听打开状态，初始化时同步 LocalStorage 到父组件
watch(() => props.open, (newVal) => {
  if (newVal) {
    // 打开面板时，将 LocalStorage 的值同步给父组件
    if (localApiBaseURL.value && !props.apiBaseURL) {
      emit('update:apiBaseURL', localApiBaseURL.value)
    }
    if (localApiKey.value && !props.apiKey) {
      emit('update:apiKey', localApiKey.value)
    }
    if (localModelName.value && !props.modelName) {
      emit('update:modelName', localModelName.value)
    }
  }
})

// 监听 LocalStorage 变化，实时同步到父组件
watch(localApiBaseURL, (val) => {
  if (val) emit('update:apiBaseURL', val)
})
watch(localApiKey, (val) => {
  if (val) emit('update:apiKey', val)
})
watch(localModelName, (val) => {
  if (val) emit('update:modelName', val)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="handleClose"
        />

        <!-- Panel -->
        <Transition
          enter-active-class="transition ease-out duration-200 delay-75"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div class="relative z-10 w-full max-w-md mx-4">
            <div class="backdrop-blur-xl bg-zinc-900/80 border border-white/10 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10">
              <!-- Header -->
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-lg font-mono text-cyan-400 tracking-wider uppercase">
                  {{ t('settings.title') }}
                </h2>
                <button 
                  @click="handleClose"
                  class="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Form -->
              <div class="space-y-5">
                <!-- API Base URL -->
                <div>
                  <label class="block text-xs font-mono text-zinc-400 mb-2 tracking-wider uppercase">
                    {{ t('settings.baseUrl') }}
                  </label>
                  <input 
                    v-model="apiBaseURL"
                    type="text"
                    :placeholder="t('settings.baseUrlPlaceholder')"
                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-zinc-100 font-mono text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all"
                  />
                </div>

                <!-- API Key -->
                <div>
                  <label class="block text-xs font-mono text-zinc-400 mb-2 tracking-wider uppercase">
                    {{ t('settings.apiKey') }}
                  </label>
                  <input 
                    v-model="apiKey"
                    type="password"
                    :placeholder="t('settings.apiKeyPlaceholder')"
                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-zinc-100 font-mono text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all"
                  />
                </div>

                <!-- Model Name -->
                <div>
                  <label class="block text-xs font-mono text-zinc-400 mb-2 tracking-wider uppercase">
                    {{ t('settings.modelName') }}
                  </label>
                  <input 
                    v-model="modelName"
                    type="text"
                    :placeholder="t('settings.modelNamePlaceholder')"
                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-zinc-100 font-mono text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all"
                  />
                  <p class="mt-1.5 text-[10px] font-mono text-zinc-500">
                    {{ t('settings.modelNameHint') }}
                  </p>
                </div>

                <!-- Test Connection -->
                <div class="pt-2">
                  <button
                    @click="handleTestConnection"
                    :disabled="isTesting || !isConfigValid"
                    :class="[
                      'w-full px-4 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
                      isTesting || !isConfigValid
                        ? 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed'
                        : 'bg-white/5 border border-white/10 text-zinc-300 hover:border-cyan-400/50 hover:text-cyan-400'
                    ]"
                  >
                    <span v-if="isTesting" class="flex items-center gap-2">
                      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {{ t('settings.testing') }}
                    </span>
                    <span v-else class="flex items-center gap-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {{ t('settings.testConnection') }}
                    </span>
                  </button>

                  <!-- Test Result Message -->
                  <div
                    v-if="testMessage"
                    :class="[
                      'mt-3 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-300',
                      testStatus === 'success'
                        ? 'bg-green-400/10 border border-green-400/30 text-green-400'
                        : testStatus === 'error'
                          ? 'bg-red-400/10 border border-red-400/30 text-red-400'
                          : 'bg-white/5 border border-white/10 text-zinc-400'
                    ]"
                  >
                    {{ testMessage }}
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="mt-6 flex justify-end gap-3">
                <button 
                  @click="handleClose"
                  class="px-6 py-2.5 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 text-cyan-400 font-mono text-sm rounded-lg transition-all duration-200 uppercase tracking-wider cursor-pointer"
                >
                  {{ t('settings.save') }}
                </button>
              </div>

              <!-- Status Indicator -->
              <div
                v-if="isConfigValid"
                class="absolute top-4 right-12 w-2 h-2 rounded-full bg-green-400 animate-pulse"
                title="Configuration valid"
              />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
