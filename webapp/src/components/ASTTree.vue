<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ASTNode } from '../types/bitwise'

const { t } = useI18n()

interface Props {
  expression: string
  astNodes?: string[]
  ast?: ASTNode | null
  bitsMode?: '8bit' | '32bit'
}

const props = withDefaults(defineProps<Props>(), {
  bitsMode: '8bit',
  ast: null
})

const isVisible = ref(false)

// 平移和缩放状态
const panX = ref(0)
const panY = ref(0)
const scale = ref(1)
const isDragging = ref(false)
const lastMouseX = ref(0)
const lastMouseY = ref(0)

const minScale = 0.3
const maxScale = 4
const scaleSpeed = 0.0015

// 容器引用
const containerRef = ref<HTMLDivElement | null>(null)
const contentRef = ref<HTMLDivElement | null>(null)

// 节点尺寸常量
const NODE_WIDTH = 64
const NODE_HEIGHT = 48
const LEVEL_SPACING = 90
const SIBLING_SPACING = 80

interface TreeNode {
  id: string
  value: string
  type: 'operator' | 'operand'
  level: number
  x: number
  y: number
  parentId?: string
  children?: TreeNode[]
}

const isOperator = (char: string): boolean => {
  return ['&', '|', '~', '^', '<<', '>>'].includes(char)
}

// 从结构化 AST 构建树
const buildTreeFromAST = computed(() => {
  if (!props.ast) return null
  
  const nodeMap = new Map<string, TreeNode>()
  const levels: TreeNode[][] = []
  
  // 递归遍历 AST
  function traverse(node: ASTNode, level: number, x: number): TreeNode | null {
    const treeNode: TreeNode = {
      id: node.id,
      value: node.value,
      type: node.type,
      level,
      x,
      y: level * LEVEL_SPACING,
      children: []
    }
    
    if (!levels[level]) {
      levels[level] = []
    }
    levels[level].push(treeNode)
    nodeMap.set(node.id, treeNode)
    
    // 处理子节点
    if (node.left) {
      const leftChild = traverse(node.left, level + 1, x - SIBLING_SPACING)
      if (leftChild) {
        treeNode.children?.push(leftChild)
        leftChild.parentId = node.id
      }
    }
    
    if (node.right) {
      const rightChild = traverse(node.right, level + 1, x + SIBLING_SPACING)
      if (rightChild) {
        treeNode.children?.push(rightChild)
        rightChild.parentId = node.id
      }
    }
    
    return treeNode
  }
  
  const root = traverse(props.ast, 0, 0)
  
  if (!root) return null
  
  // 收集所有节点
  const allNodes: TreeNode[] = []
  function collectNodes(node: TreeNode) {
    allNodes.push(node)
    node.children?.forEach(collectNodes)
  }
  collectNodes(root)
  
  return {
    root,
    nodes: allNodes,
    levels,
    maxLevel: levels.length - 1,
    totalNodes: allNodes.length
  }
})

// 从简单数组构建（向后兼容）
const buildTreeFromArray = computed(() => {
  if (!props.astNodes || props.astNodes.length === 0) {
    return null
  }

  const nodes: TreeNode[] = []
  let nodeId = 0

  for (let i = 0; i < props.astNodes.length; i++) {
    const value = props.astNodes[i]
    const type = isOperator(value) ? 'operator' : 'operand'
    
    const node: TreeNode = {
      id: `node-${nodeId++}`,
      value,
      type,
      level: 0,
      x: 0,
      y: 0
    }

    nodes.push(node)
  }

  // 使用栈计算层级
  const stack: TreeNode[] = []
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]
    
    if (node.type === 'operand') {
      node.level = stack.length
      stack.push(node)
    } else {
      node.level = stack.length
      if (node.value !== '~') {
        stack.push(node)
      }
    }
  }

  // 按层级分组
  const levels: TreeNode[][] = []
  nodes.forEach(node => {
    if (!levels[node.level]) {
      levels[node.level] = []
    }
    levels[node.level].push(node)
  })

  // 计算 X 坐标
  levels.forEach((levelNodes, levelIndex) => {
    const levelWidth = levelNodes.length * SIBLING_SPACING
    const startX = -(levelWidth / 2) + (SIBLING_SPACING / 2)
    
    levelNodes.forEach((node, nodeIndex) => {
      node.x = startX + nodeIndex * SIBLING_SPACING
      node.y = levelIndex * LEVEL_SPACING
    })
  })

  const maxLevel = levels.length - 1

  return {
    nodes,
    levels,
    maxLevel,
    totalNodes: nodes.length
  }
})

// 优先使用结构化 AST，否则回退到数组
const buildTree = computed(() => {
  if (props.ast) {
    return buildTreeFromAST.value
  }
  return buildTreeFromArray.value
})

// 获取节点 CSS 位置
const getNodeStyle = (node: TreeNode) => {
  if (!buildTree.value) return {}
  
  const adjustedX = node.x + NODE_WIDTH / 2
  
  return {
    transform: `translate(${adjustedX}px, ${node.y + 40}px)`,
    width: `${NODE_WIDTH}px`,
    height: `${NODE_HEIGHT}px`
  }
}

// 获取连线坐标
const getLineCoords = (node: TreeNode) => {
  if (!buildTree.value || !node.parentId) return null
  
  const parent = buildTree.value.nodes.find(n => n.id === node.parentId)
  if (!parent) return null
  
  const parentX = parent.x + NODE_WIDTH / 2
  const parentY = parent.y + 40
  const childX = node.x + NODE_WIDTH / 2
  const childY = node.y + 40
  
  return { x1: parentX, y1: parentY, x2: childX, y2: childY }
}

// 鼠标滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  
  const delta = -e.deltaY * scaleSpeed
  const newScale = Math.min(maxScale, Math.max(minScale, scale.value * (1 + delta)))
  scale.value = newScale
}

// 鼠标按下开始拖动
const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  lastMouseX.value = e.clientX
  lastMouseY.value = e.clientY
  containerRef.value?.classList.add('cursor-grabbing')
}

// 鼠标移动处理拖动
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const deltaX = e.clientX - lastMouseX.value
  const deltaY = e.clientY - lastMouseY.value
  
  panX.value += deltaX
  panY.value += deltaY
  
  lastMouseX.value = e.clientX
  lastMouseY.value = e.clientY
}

// 鼠标释放停止拖动
const handleMouseUp = () => {
  isDragging.value = false
  containerRef.value?.classList.remove('cursor-grabbing')
}

// 鼠标离开容器时停止拖动
const handleMouseLeave = () => {
  isDragging.value = false
  containerRef.value?.classList.remove('cursor-grabbing')
}

// 重置视图
const resetView = () => {
  panX.value = 0
  panY.value = 0
  scale.value = 1
}

onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      isVisible.value = true
    }, 100)
  })
  
  const container = containerRef.value
  if (container) {
    container.addEventListener('wheel', handleWheel, { passive: false })
  }
})

onUnmounted(() => {
  const container = containerRef.value
  if (container) {
    container.removeEventListener('wheel', handleWheel)
  }
})
</script>

<template>
  <div class="h-full flex flex-col backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 overflow-hidden">
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h2 class="text-cyan-400/80 text-sm font-mono uppercase tracking-widest">
          {{ t('astTree.title', 'AST Visualization') }}
        </h2>
        <div
          v-if="buildTree"
          class="px-2 py-0.5 text-xs font-mono bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 rounded"
        >
          {{ buildTree.totalNodes }} {{ t('astTree.nodes', 'nodes') }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-lg bg-cyan-400/20 border border-cyan-400/50" />
          <span class="text-xs font-mono text-zinc-400">{{ t('astTree.operator', 'Operator') }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-lg bg-white/10 border border-white/20" />
          <span class="text-xs font-mono text-zinc-400">{{ t('astTree.operand', 'Operand') }}</span>
        </div>
      </div>
    </div>

    <!-- 可视化区域 -->
    <div 
      ref="containerRef"
      class="flex-1 min-h-0 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
    >
      <!-- 重置按钮 -->
      <button
        v-if="buildTree && (panX !== 0 || panY !== 0 || Math.abs(scale - 1) > 0.01)"
        @click="resetView"
        class="absolute top-0 right-0 z-50 px-3 py-1.5 text-xs font-mono text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 rounded-lg hover:bg-cyan-400/20 transition-all cursor-pointer hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
      >
        {{ t('astTree.resetView', 'Reset View') }}
      </button>
      
      <!-- 缩放指示器 -->
      <div 
        v-if="buildTree"
        class="absolute top-0 left-0 z-50 px-3 py-1.5 text-xs font-mono text-zinc-400 bg-white/5 border border-white/10 rounded-lg"
      >
        {{ Math.round(scale * 100) }}%
      </div>

      <template v-if="buildTree">
        <!-- 变换容器 -->
        <div
          ref="contentRef"
          class="absolute inset-0"
          :style="{
            transform: `translate(${panX + 100}px, ${panY + 60}px) scale(${scale})`,
            transformOrigin: 'center top',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            width: '100%',
            height: '100%'
          }"
        >
          <!-- SVG 连线层 -->
          <svg
            class="absolute overflow-visible"
            :style="{
              width: '100%',
              height: '100%'
            }"
          >
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color: rgba(34, 211, 238, 0.2)" />
                <stop offset="100%" style="stop-color: rgba(34, 211, 238, 0.5)" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <!-- 绘制连线 -->
            <g v-if="isVisible">
              <template v-for="node in buildTree.nodes" :key="'line-' + node.id">
                <line
                  v-if="node.parentId"
                  :x1="getLineCoords(node)?.x1 || 0"
                  :y1="getLineCoords(node)?.y1 || 0"
                  :x2="getLineCoords(node)?.x2 || 0"
                  :y2="getLineCoords(node)?.y2 || 0"
                  stroke="url(#lineGradient)"
                  stroke-width="2"
                  stroke-linecap="round"
                  filter="url(#glow)"
                  class="opacity-60"
                />
              </template>
            </g>
          </svg>

          <!-- 节点层 -->
          <div
            v-for="node in buildTree.nodes"
            :key="node.id"
            class="absolute flex items-center justify-center"
            :style="[
              getNodeStyle(node),
              {
                opacity: isVisible ? 1 : 0,
                transform: isVisible 
                  ? `${getNodeStyle(node).transform} translate(-50%, 0)` 
                  : `${getNodeStyle(node).transform} translate(-50%, -10px)`,
                transition: isVisible 
                  ? 'opacity 0.5s ease, transform 0.5s ease-out' 
                  : 'none'
              }
            ]"
          >
            <div
              :class="[
                'relative flex items-center justify-center rounded-xl border font-mono text-base transition-all duration-300 cursor-default',
                node.type === 'operator'
                  ? 'w-16 h-12 bg-cyan-400/10 border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/20 hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:scale-110 hover:border-cyan-400/70'
                  : 'w-16 h-12 bg-white/5 border-white/20 text-zinc-100 hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-110',
              ]"
            >
              <!-- 运算符符号 -->
              <span
                v-if="node.value === '&'"
                class="text-xl font-bold"
              >
                &amp;
              </span>
              <span
                v-else-if="node.value === '|'"
                class="text-xl font-bold"
              >
                |
              </span>
              <span
                v-else-if="node.value === '~'"
                class="text-xl font-bold"
              >
                ~
              </span>
              <span
                v-else-if="node.value === '^'"
                class="text-xl font-bold"
              >
                ^
              </span>
              <span
                v-else-if="node.value === '<<'"
                class="text-xs font-bold"
              >
                &lt;&lt;
              </span>
              <span
                v-else-if="node.value === '>>'"
                class="text-xs font-bold"
              >
                &gt;&gt;
              </span>
              <!-- 操作数 -->
              <span v-else class="text-sm font-semibold">
                {{ node.value }}
              </span>

              <!-- 类型标签 -->
              <div
                :class="[
                  'absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] font-mono uppercase tracking-wider whitespace-nowrap',
                  node.type === 'operator' ? 'text-cyan-400/60' : 'text-zinc-500'
                ]"
              >
                {{ node.type === 'operator' ? 'OP' : 'VAL' }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 空状态 -->
      <template v-else>
        <div class="flex h-full items-center justify-center">
          <div class="text-center text-zinc-500 font-mono text-sm">
            <div class="mb-2">{{ t('astTree.noData', 'No AST data') }}</div>
            <div class="text-xs text-zinc-600">{{ t('astTree.executeHint', 'Execute expression to visualize') }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- 表达式显示 -->
    <div class="mt-4 pt-4 border-t border-white/10">
      <div class="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
        {{ t('astTree.expression', 'Expression') }}
      </div>
      <div class="px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg font-mono text-sm text-zinc-300 truncate">
        {{ expression || t('astTree.noExpression', 'No expression') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: rgba(34, 211, 238, 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(34, 211, 238, 0.5);
}
</style>
