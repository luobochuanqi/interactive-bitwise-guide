import { ref, computed, watch } from 'vue'
import type { BitwiseResponse, OperationStep } from '../types/bitwise'

export function useBitwiseEngine(initialData?: BitwiseResponse) {
  const currentStepIndex = ref(0)
  const previousStepIndex = ref(-1)
  const bitsMode = ref<'8bit' | '32bit'>('8bit')
  const isPlaying = ref(false)
  const playInterval = ref<ReturnType<typeof setInterval> | null>(null)
  const data = ref<BitwiseResponse | null>(initialData || null)

  // 监听 initialData 变化（当作为 prop 传入时）
  watch(
    () => initialData,
    (newData) => {
      if (newData) {
        setData(newData)
      }
    },
    { immediate: false }
  )

  const steps = computed(() => data.value?.steps || [])
  const currentStep = computed(() => steps.value[currentStepIndex.value] || null)
  const prevStep = computed(() => {
    if (previousStepIndex.value < 0 || previousStepIndex.value >= steps.value.length) {
      return null
    }
    return steps.value[previousStepIndex.value] || null
  })

  const totalSteps = computed(() => steps.value.length)
  const progress = computed(() => {
    if (totalSteps.value === 0) return 0
    return ((currentStepIndex.value + 1) / totalSteps.value) * 100
  })

  const canGoPrevious = computed(() => currentStepIndex.value > 0)
  const canGoNext = computed(() => currentStepIndex.value < totalSteps.value - 1)

  function setData(newData: BitwiseResponse) {
    data.value = newData
    currentStepIndex.value = 0
    previousStepIndex.value = -1
    stopPlayback()
  }

  function setBitsMode(mode: '8bit' | '32bit') {
    bitsMode.value = mode
  }

  function goToStep(index: number) {
    if (index < 0 || index >= totalSteps.value) return
    
    previousStepIndex.value = currentStepIndex.value
    currentStepIndex.value = index
  }

  function nextStep() {
    if (!canGoNext.value) return
    goToStep(currentStepIndex.value + 1)
  }

  function goToPrevious() {
    if (!canGoPrevious.value) return
    goToStep(currentStepIndex.value - 1)
  }

  function reset() {
    currentStepIndex.value = 0
    previousStepIndex.value = -1
    stopPlayback()
  }

  function togglePlayback() {
    if (isPlaying.value) {
      stopPlayback()
    } else {
      startPlayback()
    }
  }

  function startPlayback() {
    if (isPlaying.value || totalSteps.value === 0) return
    
    isPlaying.value = true
    
    if (currentStepIndex.value >= totalSteps.value - 1) {
      currentStepIndex.value = 0
      previousStepIndex.value = -1
    }
    
    playInterval.value = setInterval(() => {
      if (currentStepIndex.value >= totalSteps.value - 1) {
        stopPlayback()
        return
      }
      nextStep()
    }, 2000)
  }

  function stopPlayback() {
    isPlaying.value = false
    if (playInterval.value) {
      clearInterval(playInterval.value)
      playInterval.value = null
    }
  }

  function getChangedBits(): number[] {
    if (!currentStep.value || !prevStep.value) {
      return currentStep.value?.highlight_bits || []
    }

    const currentBits = currentStep.value.highlight_bits
    const prevResultBinary = prevStep.value.result.binary
    const currResultBinary = currentStep.value.result.binary
    
    const maxLength = Math.max(prevResultBinary.length, currResultBinary.length)
    const prevPadded = prevResultBinary.padStart(maxLength, '0')
    const currPadded = currResultBinary.padStart(maxLength, '0')
    
    const changedBits: number[] = []
    
    for (let i = 0; i < maxLength; i++) {
      const bitPosition = maxLength - 1 - i
      if (prevPadded[i] !== currPadded[i]) {
        changedBits.push(bitPosition)
      }
    }
    
    return changedBits.length > 0 ? changedBits : currentBits
  }

  watch(
    () => isPlaying.value,
    (playing) => {
      if (!playing) {
        stopPlayback()
      }
    }
  )

  return {
    data,
    steps,
    currentStep,
    previousStep: prevStep,
    currentStepIndex,
    previousStepIndex,
    totalSteps,
    progress,
    canGoPrevious,
    canGoNext,
    bitsMode,
    isPlaying,
    setData,
    setBitsMode,
    goToStep,
    nextStep,
    goToPrevious,
    reset,
    togglePlayback,
    getChangedBits
  }
}
