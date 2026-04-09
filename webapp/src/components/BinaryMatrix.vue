<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBitwiseEngine } from '../composables/useBitwiseEngine'

const { t } = useI18n()

interface Props {
  initialData?: import('../types/bitwise').BitwiseResponse
  externalStepIndex?: number
  useExternalControl?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  externalStepIndex: 0,
  useExternalControl: false
})

const {
  currentStep,
  previousStep: prevStep,
  currentStepIndex: internalStepIndex,
  totalSteps,
  progress,
  canGoPrevious,
  canGoNext,
  bitsMode,
  isPlaying,
  nextStep,
  goToPrevious,
  reset,
  togglePlayback,
  setBitsMode,
  getChangedBits
} = useBitwiseEngine(props.initialData)

const currentStepIndex = computed(() => {
  if (props.useExternalControl) {
    return props.externalStepIndex
  }
  return internalStepIndex.value
})

const bitWidth = computed(() => bitsMode.value === '8bit' ? 8 : 32)

const currentBinary = computed(() => {
  const step = props.useExternalControl 
    ? props.initialData?.steps[props.externalStepIndex]
    : currentStep.value
  
  if (!step) return ''
  return step.result.binary.padStart(bitWidth.value, '0')
})

const previousBinary = computed(() => {
  if (props.useExternalControl) {
    const prevIndex = props.externalStepIndex - 1
    if (prevIndex < 0 || !props.initialData) return ''
    const prevStep = props.initialData.steps[prevIndex]
    if (!prevStep) return ''
    return prevStep.result.binary.padStart(bitWidth.value, '0')
  }
  
  if (!prevStep.value) return ''
  return prevStep.value.result.binary.padStart(bitWidth.value, '0')
})

const changedBits = computed(() => {
  const step = props.useExternalControl 
    ? props.initialData?.steps[props.externalStepIndex]
    : currentStep.value
  
  if (!step) return []
  
  if (!previousBinary.value) {
    return step.highlight_bits
  }

  const prev = previousBinary.value
  const curr = currentBinary.value
  const changed: number[] = []

  for (let i = 0; i < bitWidth.value; i++) {
    const bitPosition = bitWidth.value - 1 - i
    if (prev[i] !== curr[i]) {
      changed.push(bitPosition)
    }
  }

  return changed.length > 0 ? changed : step.highlight_bits
})

const bitLabels = computed(() => {
  return Array.from({ length: bitWidth.value }, (_, i) => bitWidth.value - 1 - i)
})

const byteGroups = computed(() => {
  const bytes: number[][] = []
  for (let i = 0; i < bitWidth.value; i += 8) {
    bytes.push(Array.from({ length: 8 }, (_, j) => i + j))
  }
  return bytes.reverse()
})

function isBitChanged(bitPosition: number): boolean {
  return changedBits.value.includes(bitPosition)
}

function getBitValue(bitPosition: number): string {
  const index = bitWidth.value - 1 - bitPosition
  return currentBinary.value[index] || '0'
}

const activeStep = computed(() => {
  if (props.useExternalControl) {
    return props.initialData?.steps[props.externalStepIndex] || null
  }
  return currentStep.value
})

const effectiveCanGoPrevious = computed(() => {
  if (props.useExternalControl) {
    return props.externalStepIndex > 0
  }
  return canGoPrevious.value
})

const effectiveCanGoNext = computed(() => {
  if (props.useExternalControl) {
    return props.initialData 
      ? props.externalStepIndex < props.initialData.steps.length - 1
      : false
  }
  return canGoNext.value
})

const effectiveProgress = computed(() => {
  if (props.useExternalControl) {
    if (!props.initialData || props.initialData.steps.length === 0) return 0
    return ((props.externalStepIndex + 1) / props.initialData.steps.length) * 100
  }
  return progress.value
})
</script>

<template>
  <div class="relative h-full flex flex-col">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h2 class="text-cyan-400/80 text-sm font-mono uppercase tracking-widest">
          {{ t('binaryMatrix.mode8bit') }} / {{ t('binaryMatrix.mode32bit') }} Matrix
        </h2>
        <div class="flex items-center gap-3 px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
          <button
            @click="setBitsMode('8bit')"
            :class="[
              'px-2 py-0.5 text-xs font-mono rounded transition-all cursor-pointer',
              bitsMode === '8bit'
                ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30'
                : 'text-zinc-500 hover:text-zinc-300'
            ]"
          >
            {{ t('binaryMatrix.mode8bit') }}
          </button>
          <button
            @click="setBitsMode('32bit')"
            :class="[
              'px-2 py-0.5 text-xs font-mono rounded transition-all cursor-pointer',
              bitsMode === '32bit'
                ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30'
                : 'text-zinc-500 hover:text-zinc-300'
            ]"
          >
            {{ t('binaryMatrix.mode32bit') }}
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="text-xs font-mono text-zinc-500">
          {{ t('binaryMatrix.step') }} {{ currentStepIndex + 1 }} / {{ totalSteps }}
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="text-xs font-mono text-zinc-500">
          Step {{ currentStepIndex + 1 }} / {{ totalSteps }}
        </div>
        <div class="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
            :style="{ width: `${effectiveProgress}%` }"
          />
        </div>
      </div>
    </div>

    <div class="flex-1 backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-2xl p-6 overflow-auto pb-24">
      <template v-if="activeStep">
        <div class="flex flex-col h-full">
          <div class="flex items-center justify-between mb-6">
            <div>
              <div class="text-xs font-mono text-cyan-400/60 uppercase tracking-wider mb-1">
                {{ activeStep.operation_name }}
              </div>
              <div class="text-lg text-zinc-100 font-mono">
                {{ activeStep.expression_part }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-1">
                {{ t('binaryMatrix.result') }}
              </div>
              <div class="text-2xl font-mono text-cyan-400">
                {{ activeStep.result.decimal }}
              </div>
            </div>
          </div>

          <div class="flex-1 flex items-center justify-center overflow-x-auto">
            <div class="relative">
              <div 
                class="absolute inset-0 bg-gradient-to-b from-cyan-400/5 to-transparent rounded-xl blur-xl"
                :class="{ 'opacity-100': changedBits.length > 0, 'opacity-0': changedBits.length === 0 }"
              />
              
              <div class="relative backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <div class="flex justify-center mb-2 overflow-x-auto">
                  <div 
                    class="flex gap-0.5"
                    :class="bitsMode === '32bit' ? 'gap-[2px]' : 'gap-1'"
                  >
                    <div
                      v-for="byteGroup in byteGroups"
                      :key="byteGroup[0]"
                      class="flex"
                      :class="bitsMode === '32bit' ? 'pr-4 last:pr-0 border-r border-white/10 last:border-0' : 'gap-1'"
                    >
                      <div
                        v-for="bitPosition in byteGroup"
                        :key="bitPosition"
                        class="relative flex flex-col items-center"
                      >
                        <div
                          :class="[
                            'flex items-center justify-center rounded font-mono transition-all duration-300',
                            bitsMode === '32bit'
                              ? 'w-5 h-8 text-xs border'
                              : 'w-8 h-12 text-lg border',
                            isBitChanged(bitPosition)
                              ? 'bg-cyan-400/20 text-cyan-400 border-cyan-400/50 animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                              : 'bg-white/[0.05] text-zinc-300 border-white/10'
                          ]"
                        >
                          {{ getBitValue(bitPosition) }}
                        </div>
                        <div 
                          class="mt-1 text-[8px] font-mono text-zinc-600 uppercase"
                          :class="bitsMode === '32bit' ? 'text-[7px]' : ''"
                        >
                          {{ bitPosition }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-4 flex justify-center gap-4 text-xs font-mono">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 bg-cyan-400/20 border border-cyan-400/50 rounded animate-pulse" />
                    <span class="text-zinc-400">{{ t('binaryMatrix.changedBits') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 bg-white/[0.05] border border-white/10 rounded" />
                    <span class="text-zinc-400">{{ t('binaryMatrix.unchangedBits') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 p-4 backdrop-blur-xl bg-white/[0.02] border border-white/10 rounded-xl">
            <div class="text-xs font-mono text-cyan-400/60 uppercase tracking-wider mb-2">
              {{ t('binaryMatrix.explanation') }}
            </div>
            <div class="text-sm text-zinc-300 font-mono leading-relaxed">
              {{ activeStep.explanation }}
            </div>
            <div class="mt-2 text-xs font-mono text-zinc-500 italic">
              {{ activeStep.rule_citation }}
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="text-center text-zinc-500 font-mono text-sm mt-8">
          {{ t('binaryMatrix.noData') }}
        </div>
      </template>
    </div>
  </div>
</template>
