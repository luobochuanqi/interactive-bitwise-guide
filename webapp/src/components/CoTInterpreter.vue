<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OperationStep } from '../types/bitwise'

const { t } = useI18n()

interface Props {
  steps: OperationStep[]
  currentStepIndex: number
  isPlaying?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false
})

const displayedText = ref('')
const isTyping = ref(false)
const currentCharIndex = ref(0)
const typingSpeed = 12

const currentStep = computed(() => {
  if (props.steps.length === 0) return null
  return props.steps[props.currentStepIndex] || null
})

const fullExplanation = computed(() => {
  if (!currentStep.value) return ''
  return currentStep.value.explanation
})

const formattedCitation = computed(() => {
  if (!currentStep.value) return ''
  return currentStep.value.rule_citation
})

function typeWriter() {
  if (!currentStep.value) return

  const text = fullExplanation.value
  displayedText.value = ''
  currentCharIndex.value = 0
  isTyping.value = true

  const interval = setInterval(() => {
    if (currentCharIndex.value < text.length) {
      displayedText.value += text[currentCharIndex.value]
      currentCharIndex.value++
    } else {
      isTyping.value = false
      clearInterval(interval)
    }
  }, typingSpeed)
}

watch(
  () => props.currentStepIndex,
  () => {
    if (currentStep.value) {
      typeWriter()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  isTyping.value = false
})
</script>

<template>
  <div class="h-full flex flex-col backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h2 class="text-cyan-400/80 text-sm font-mono uppercase tracking-widest">
          {{ t('cotInterpreter.title') }}
        </h2>
        <div
          v-if="isTyping"
          class="flex items-center gap-1"
        >
          <span class="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 0ms" />
          <span class="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 150ms" />
          <span class="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 300ms" />
        </div>
      </div>
      <div class="text-xs font-mono text-zinc-500">
        {{ t('binaryMatrix.step') }} {{ steps.length > 0 ? currentStepIndex + 1 : 0 }} / {{ steps.length }}
      </div>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto">
      <template v-if="currentStep">
        <div class="space-y-3">
          <div class="p-4 bg-gradient-to-br from-cyan-400/10 to-transparent border border-cyan-400/20 rounded-xl hover:border-cyan-400/30 transition-all duration-200">
            <div class="text-xs font-mono text-cyan-400/60 uppercase tracking-wider mb-1">
              {{ t('cotInterpreter.operation') }}
            </div>
            <div class="text-lg font-mono text-zinc-100">
              {{ currentStep.operation_name }}
            </div>
            <div class="mt-1 text-xs font-mono text-zinc-400">
              {{ currentStep.expression_part }}
            </div>
          </div>

          <div class="p-4 bg-white/[0.02] border border-white/10 rounded-xl hover:border-cyan-400/20 transition-all duration-200">
            <div class="text-xs font-mono text-cyan-400/60 uppercase tracking-wider mb-2">
              {{ t('cotInterpreter.explanation') }}
            </div>
            <div class="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">
              {{ displayedText }}
              <span
                v-if="isTyping"
                class="inline-block w-2 h-4 ml-1 bg-cyan-400/60 animate-pulse"
              />
            </div>
          </div>

          <div class="p-3 bg-white/[0.02] border border-white/10 rounded-xl hover:border-cyan-400/20 transition-all duration-200">
            <div class="text-xs font-mono text-cyan-400/60 uppercase tracking-wider mb-1">
              {{ t('binaryMatrix.ruleCitation') }}
            </div>
            <div class="text-xs text-zinc-400 font-mono italic">
              {{ formattedCitation }}
            </div>
          </div>

          <div v-if="currentStep.operands.length > 0" class="p-3 bg-white/[0.02] border border-white/10 rounded-xl hover:border-cyan-400/20 transition-all duration-200">
            <div class="text-xs font-mono text-cyan-400/60 uppercase tracking-wider mb-2">
              {{ t('cotInterpreter.operands') }}
            </div>
            <div class="space-y-1.5">
              <div
                v-for="operand in currentStep.operands"
                :key="operand.name"
                class="flex items-center justify-between text-xs font-mono group"
              >
                <span class="text-zinc-400 group-hover:text-zinc-300 transition-colors">{{ operand.name }}:</span>
                <span class="text-cyan-400 group-hover:text-cyan-300 transition-colors">{{ operand.decimal }}</span>
              </div>
            </div>
          </div>

          <div class="p-4 bg-gradient-to-br from-cyan-400/5 to-purple-400/5 border border-cyan-400/20 rounded-xl hover:border-cyan-400/30 transition-all duration-200">
            <div class="text-xs font-mono text-cyan-400/60 uppercase tracking-wider mb-1">
              {{ t('cotInterpreter.result') }}
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono text-zinc-400">{{ currentStep.result.name }}:</span>
              <span class="text-lg font-mono text-cyan-400 glow-text">{{ currentStep.result.decimal }}</span>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="flex h-full items-center justify-center">
          <div class="text-center text-zinc-500 font-mono text-sm">
            <div class="mb-2">暂无步骤数据</div>
            <div class="text-xs text-zinc-600">执行表达式以开始</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.glow-text {
  text-shadow: 0 0 10px rgba(34, 211, 238, 0.5),
               0 0 20px rgba(34, 211, 238, 0.3),
               0 0 30px rgba(34, 211, 238, 0.2);
}
</style>
