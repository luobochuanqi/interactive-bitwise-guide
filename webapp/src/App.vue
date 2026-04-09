<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { setUserLanguage } from './services/api'
import SettingsPanel from './components/SettingsPanel.vue'
import InputHub from './components/InputHub.vue'
import BinaryMatrix from './components/BinaryMatrix.vue'
import CoTInterpreter from './components/CoTInterpreter.vue'
import TheoryCards from './components/TheoryCards.vue'
import { useBitwiseSession } from './composables/useBitwiseSession'

const { locale, t } = useI18n()

const toggleLanguage = () => {
  const newLang = locale.value === 'en' ? 'zh' : 'en'
  locale.value = newLang
  setUserLanguage(newLang)
}

watch(locale, (newLang) => {
  setUserLanguage(newLang === 'zh' ? 'zh' : 'en')
})

const isSettingsOpen = ref(false)

const {
  state,
  currentData,
  currentStepIndex,
  isPlaying,
  canGoPrevious,
  canGoNext,
  executeExpression,
  nextStep,
  goToPrevious,
  reset,
  togglePlayback,
  setApiConfig
} = useBitwiseSession()

const openSettings = () => {
  isSettingsOpen.value = true
}

const handleExecute = async () => {
  await executeExpression()
}

const handleSettingsSave = (baseURL: string, key: string) => {
  setApiConfig(baseURL, key)
}

const handleTestConnection = async () => {
  // Test connection by making a simple API call
  try {
    await executeExpression()
  } catch (error) {
    // Error will be shown in the UI
  }
}

// 显式监听 SettingsPanel 的更新事件
const handleApiBaseURLUpdate = (value: string) => {
  state.apiBaseURL = value
  console.log('[App.vue] API Base URL updated:', value)
}

const handleApiKeyUpdate = (value: string) => {
  state.apiKey = value
  console.log('[App.vue] API Key updated:', value ? '✓' : '✗')
}

const handleModelNameUpdate = (value: string) => {
  state.modelName = value
  console.log('[App.vue] Model Name updated:', value)
}
</script>

<template>
  <div class="relative h-screen w-screen bg-zinc-950 overflow-hidden">
    <!-- Background ambient glow -->
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.15),transparent_50%)] pointer-events-none" />
    
    <!-- Grid overlay -->
    <div 
      class="absolute inset-0 opacity-[0.03] pointer-events-none"
      style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 40px 40px;"
    />

    <!-- Settings Panel Modal -->
    <SettingsPanel 
      v-model:open="isSettingsOpen" 
      :apiBaseURL="state.apiBaseURL"
      :apiKey="state.apiKey"
      :modelName="state.modelName"
      @update:apiBaseURL="handleApiBaseURLUpdate"
      @update:apiKey="handleApiKeyUpdate"
      @update:modelName="handleModelNameUpdate"
      @test-connection="handleTestConnection"
    />

    <!-- Language Toggle -->
    <button
      @click="toggleLanguage"
      class="fixed top-4 right-4 z-50 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-cyan-400 backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg transition-all cursor-pointer"
    >
      {{ locale === 'en' ? '中文' : 'EN' }}
    </button>

    <!-- Main 3-column layout -->
    <div class="relative z-10 h-full flex">
      <!-- Left Column - Input Hub (25%) -->
      <div class="w-1/4 h-full p-4 flex flex-col gap-4">
        <InputHub 
          :apiBaseURL="state.apiBaseURL" 
          :apiKey="state.apiKey"
          :useMockData="state.useMockData"
          :isLoading="state.isLoading"
          v-model:expression="state.expression"
          v-model:x="state.x"
          v-model:y="state.y"
          @open-settings="openSettings" 
          @execute="handleExecute"
        />
      </div>

      <!-- Center Column - Binary Matrix (50%) -->
      <div class="w-1/2 h-full p-4">
        <BinaryMatrix 
          :initialData="currentData || undefined"
          :externalStepIndex="currentStepIndex"
          :useExternalControl="true"
        />
      </div>

      <!-- Right Column - CoT + Theory (25%) -->
      <div class="w-1/4 h-full p-4 flex flex-col gap-4">
        <!-- Chain of Thought Interpreter - Takes 60% of space -->
        <div class="flex-[3] min-h-0">
          <CoTInterpreter 
            :steps="currentData?.steps || []"
            :currentStepIndex="currentStepIndex"
            :isPlaying="isPlaying"
          />
        </div>
        
        <!-- Theory Cards - Takes 40% of space -->
        <div class="flex-[2] min-h-0">
          <TheoryCards 
            :steps="currentData?.steps || []"
            :currentStepIndex="currentStepIndex"
          />
        </div>
      </div>
    </div>

    <!-- Bottom Control Bar -->
    <div 
      v-if="currentData"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-6 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl"
    >
      <button
        @click="reset"
        class="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
      >
        {{ t('binaryMatrix.reset') }}
      </button>
      <button
        @click="goToPrevious"
        :disabled="!canGoPrevious"
        :class="[
          'px-6 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer',
          canGoPrevious
            ? 'bg-white/5 border border-white/10 text-zinc-300 hover:border-cyan-400/50 hover:text-cyan-400'
            : 'bg-white/[0.02] border border-white/5 text-zinc-600 cursor-not-allowed'
        ]"
      >
        {{ t('binaryMatrix.previous') }}
      </button>
      <button
        @click="togglePlayback"
        :class="[
          'px-6 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer',
          isPlaying
            ? 'bg-cyan-400/20 border border-cyan-400/50 text-cyan-400'
            : 'bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20'
        ]"
      >
        {{ isPlaying ? t('binaryMatrix.pause') : t('binaryMatrix.play') }}
      </button>
      <button
        @click="nextStep"
        :disabled="!canGoNext"
        :class="[
          'px-6 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer',
          canGoNext
            ? 'bg-white/5 border border-white/10 text-zinc-300 hover:border-cyan-400/50 hover:text-cyan-400'
            : 'bg-white/[0.02] border border-white/5 text-zinc-600 cursor-not-allowed'
        ]"
      >
        {{ t('binaryMatrix.next') }}
      </button>
    </div>

    <!-- Error Toast -->
    <div
      v-if="state.error"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-500/20 border border-red-400/50 rounded-xl backdrop-blur-xl"
    >
      <div class="text-sm font-mono text-red-400">
        {{ state.error }}
      </div>
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
}
</style>
