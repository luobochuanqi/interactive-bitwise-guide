<script setup lang="ts">
interface Props {
  expression: string
}

defineProps<Props>()
</script>

<template>
  <div class="h-full flex items-center justify-center">
    <div class="text-center">
      <div class="text-zinc-600 text-xs font-mono mb-2">
        No AST generated
      </div>
      <div class="text-zinc-700 text-xs font-mono">
        Enter an expression to visualize
      </div>
    </div>
  </div>
</template>
