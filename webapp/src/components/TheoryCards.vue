<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OperationStep } from '../types/bitwise'

const { t } = useI18n()

interface Props {
  steps: OperationStep[]
  currentStepIndex: number
}

const props = defineProps<Props>()

const currentStep = computed(() => {
  if (props.steps.length === 0) return null
  return props.steps[props.currentStepIndex] || null
})

const ruleType = computed(() => {
  if (!currentStep.value) return 'general'
  
  const citation = currentStep.value.rule_citation.toLowerCase()
  if (citation.includes('and')) return 'and'
  if (citation.includes('or')) return 'or'
  if (citation.includes('not') || citation.includes('~')) return 'not'
  if (citation.includes('xor') || citation.includes('^')) return 'xor'
  return 'general'
})

const ruleIcon = computed(() => {
  const icons: Record<string, string> = {
    and: '⋅',
    or: '∨',
    not: '¬',
    xor: '⊕',
    general: 'ℹ'
  }
  return icons[ruleType.value] || icons.general
})

const ruleColor = computed(() => {
  const colors: Record<string, string> = {
    and: 'from-blue-400/20 to-blue-400/5 border-blue-400/30 text-blue-400',
    or: 'from-green-400/20 to-green-400/5 border-green-400/30 text-green-400',
    not: 'from-purple-400/20 to-purple-400/5 border-purple-400/30 text-purple-400',
    xor: 'from-orange-400/20 to-orange-400/5 border-orange-400/30 text-orange-400',
    general: 'from-cyan-400/20 to-cyan-400/5 border-cyan-400/30 text-cyan-400'
  }
  return colors[ruleType.value] || colors.general
})

const theoryReference = computed(() => {
  if (!currentStep.value) return null

  const references: Record<string, { title: string; description: string; formula?: string }> = {
    and: {
      title: 'Bitwise AND',
      description: 'The AND operation compares each bit position and produces 1 only when both corresponding bits are 1. This is equivalent to logical conjunction in Boolean algebra.',
      formula: 'a ∧ b = 1 iff a=1 and b=1'
    },
    or: {
      title: 'Bitwise OR',
      description: 'The OR operation compares each bit position and produces 1 when at least one of the corresponding bits is 1. This is equivalent to logical disjunction.',
      formula: 'a ∨ b = 1 iff a=1 or b=1'
    },
    not: {
      title: 'Bitwise NOT',
      description: 'The NOT operation inverts all bits: 0 becomes 1, and 1 becomes 0. In two\'s complement representation, ~x = -x - 1.',
      formula: '¬a = ~a'
    },
    xor: {
      title: 'Bitwise XOR',
      description: 'The XOR (exclusive OR) operation produces 1 when the corresponding bits are different, and 0 when they are the same.',
      formula: 'a ⊕ b = 1 iff a≠b'
    }
  }

  return references[ruleType.value] || {
    title: 'Bitwise Operation',
    description: currentStep.value.explanation,
    formula: currentStep.value.rule_citation
  }
})
</script>

<template>
  <div class="h-full flex flex-col backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
    <div class="flex items-center gap-2 mb-4">
      <div
        :class="[
          'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold bg-gradient-to-br border transition-all duration-500 hover:scale-105',
          ruleColor
        ]"
      >
        {{ ruleIcon }}
      </div>
      <h3 class="text-cyan-400/80 text-sm font-mono uppercase tracking-widest">
        {{ t('theoryCards.title') }}
      </h3>
    </div>

    <template v-if="theoryReference">
      <div class="flex-1 min-h-0 overflow-y-auto space-y-3">
        <div 
          class="p-4 bg-gradient-to-br border rounded-xl transition-all duration-500 hover:border-white/20"
          :class="ruleColor"
        >
          <div class="text-lg font-mono text-zinc-100 mb-2">
            {{ theoryReference.title }}
          </div>
          <div class="text-xs text-zinc-300 font-mono leading-relaxed">
            {{ theoryReference.description }}
          </div>
        </div>

        <div v-if="theoryReference.formula" class="p-3 bg-black/30 border border-white/10 rounded-xl hover:border-cyan-400/30 transition-all duration-200">
          <div class="text-xs font-mono text-zinc-400 mb-1">
            {{ t('theoryCards.and.formula') }}
          </div>
          <div class="text-sm font-mono text-cyan-400">
            {{ theoryReference.formula }}
          </div>
        </div>

        <div v-if="currentStep" class="p-3 bg-white/[0.02] border border-white/10 rounded-xl hover:border-cyan-400/20 transition-all duration-200">
          <div class="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
            当前应用
          </div>
          <div class="text-xs font-mono text-zinc-300">
            {{ currentStep.expression_part }} → {{ currentStep.result.decimal }}
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="flex-1 flex items-center justify-center">
        <div class="text-center text-zinc-500 font-mono text-sm">
          选择步骤以查看理论
        </div>
      </div>
    </template>
  </div>
</template>
