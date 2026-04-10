<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ASTTree from './ASTTree.vue'

const { t } = useI18n()

import type { ASTNode } from '../types/bitwise'

interface Props {
  apiBaseURL: string
  apiKey: string
  useMockData?: boolean
  isLoading?: boolean
  astNodes?: string[]
  ast?: ASTNode | null
}

interface Emits {
  (e: 'open-settings'): void
  (e: 'execute', expression: string, x: string, y: string): void
  (e: 'update:expression', value: string): void
  (e: 'update:x', value: string): void
  (e: 'update:y', value: string): void
  (e: 'toggle-mock-mode'): void
}

const props = withDefaults(defineProps<Props>(), {
  useMockData: true,
  isLoading: false
})

const emit = defineEmits<Emits>()

const localExpression = ref('x*~y+uy*ux==-x')
const localX = ref('42')
const localY = ref('27')

const expression = computed({
  get: () => localExpression.value,
  set: (value) => {
    localExpression.value = value
    emit('update:expression', value)
  }
})

const x = computed({
  get: () => localX.value,
  set: (value) => {
    localX.value = value
    emit('update:x', value)
  }
})

const y = computed({
  get: () => localY.value,
  set: (value) => {
    localY.value = value
    emit('update:y', value)
  }
})

const xBinary = (value: string) => {
  const num = parseInt(value) || 0
  return (num >>> 0).toString(2).padStart(32, '0')
}

const yBinary = (value: string) => {
  const num = parseInt(value) || 0
  return (num >>> 0).toString(2).padStart(32, '0')
}

const handleExecute = () => {
  emit('execute', expression.value, x.value, y.value)
}
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <!-- Settings Button -->
    <button 
      @click="emit('open-settings')"
      class="group flex items-center justify-center gap-2 px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 hover:border-cyan-400/50 rounded-xl transition-all duration-200 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] cursor-pointer"
    >
      <svg class="w-5 h-5 text-zinc-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span class="text-xs font-mono text-zinc-400 group-hover:text-cyan-400 uppercase tracking-wider">
        {{ t('settings.title') }}
      </span>
    </button>

    <!-- Variable Inputs -->
    <div class="space-y-3">
      <!-- X Variable -->
      <div class="p-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl hover:border-cyan-400/20 transition-all duration-200">
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-mono text-cyan-400/80 uppercase tracking-wider">
            {{ t('inputHub.variableX') }}
          </label>
          <span class="text-xs font-mono text-zinc-500">{{ t('common.decimal') }}</span>
        </div>
        <input 
          v-model="x"
          type="text"
          placeholder="0"
          class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-zinc-100 font-mono text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-400/50 transition-all hover:border-white/20"
        />
        <div class="mt-2 text-xs font-mono text-zinc-500 truncate">
          {{ xBinary(x) }}
        </div>
      </div>

      <!-- Y Variable -->
      <div class="p-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl hover:border-cyan-400/20 transition-all duration-200">
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-mono text-cyan-400/80 uppercase tracking-wider">
            {{ t('inputHub.variableY') }}
          </label>
          <span class="text-xs font-mono text-zinc-500">{{ t('common.decimal') }}</span>
        </div>
        <input 
          v-model="y"
          type="text"
          placeholder="0"
          class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-zinc-100 font-mono text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-400/50 transition-all hover:border-white/20"
        />
        <div class="mt-2 text-xs font-mono text-zinc-500 truncate">
          {{ yBinary(y) }}
        </div>
      </div>
    </div>

    <!-- Expression Input -->
    <div class="p-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl hover:border-cyan-400/20 transition-all duration-200">
      <label class="block text-xs font-mono text-cyan-400/80 uppercase tracking-wider mb-2">
        {{ t('inputHub.expression') }}
      </label>
      <input 
        v-model="expression"
        type="text"
        placeholder="x*~y+uy*ux==-x"
        class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-zinc-100 font-mono text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-400/50 transition-all hover:border-white/20"
      />
    </div>

    <!-- Execute Button -->
    <button
      @click="handleExecute"
      :disabled="isLoading"
      :class="[
        'group relative px-4 py-3 rounded-xl font-mono text-xs uppercase tracking-widest transition-all duration-300 overflow-hidden cursor-pointer',
        isLoading
          ? 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-cyan-400/20 to-cyan-400/10 border border-cyan-400/50 text-cyan-400 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]'
      ]"
    >
        <span
          v-if="isLoading"
          class="flex items-center justify-center gap-2"
        >
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {{ t('inputHub.executing') }}
        </span>
        <span v-else class="flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {{ t('inputHub.execute') }}
        </span>
      <div
        v-if="!isLoading"
        class="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />
    </button>

    <!-- AST Tree Display -->
    <div class="flex-1 min-h-0 p-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl flex flex-col">
      <div class="text-xs font-mono text-cyan-400/80 uppercase tracking-wider mb-3 flex items-center justify-between">
        <span>{{ t('inputHub.astNodes') }}</span>
        <span class="text-zinc-500 text-[10px]">AST</span>
      </div>
      <div class="flex-1 overflow-auto">
        <ASTTree :expression="expression" :astNodes="astNodes || []" :ast="ast || null" />
      </div>
    </div>
  </div>
</template>
