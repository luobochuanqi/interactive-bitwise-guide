# AST 数据结构改进建议

## 当前问题

当前 `ast_nodes` 字段使用简单字符串数组：
```json
{
  "ast_nodes": ["&", "|", "~", "x", "y"]
}
```

**缺陷**：
1. ❌ 无法表达树的层次结构
2. ❌ 无法确定父子关系
3. ❌ 前端需要用启发式算法猜测树结构
4. ❌ 连线位置不准确
5. ❌ 节点布局可能错误

## 推荐方案：结构化 AST JSON

### 数据结构定义

```typescript
interface ASTNode {
  id: string                    // 唯一标识
  type: 'operator' | 'operand'  // 节点类型
  value: string                 // 节点值（如 "&", "x", "42"）
  level?: number                // 层级深度（可选，前端可计算）
  children?: ASTNode[]          // 子节点（二元运算有 2 个，一元运算有 1 个）
  left?: ASTNode                // 左子节点（替代 children）
  right?: ASTNode               // 右子节点（替代 children）
  metadata?: {
    operator?: string           // 运算符名称
    operandName?: string        // 操作数名称
    decimal?: number            // 十进制值
    binary?: string             // 二进制表示
  }
}
```

### 推荐响应格式

```json
{
  "expression": "x & y | ~x",
  "ast": {
    "id": "root-1",
    "type": "operator",
    "value": "|",
    "metadata": {
      "operator": "OR",
      "description": "按位或运算"
    },
    "left": {
      "id": "node-2",
      "type": "operator",
      "value": "&",
      "metadata": {
        "operator": "AND"
      },
      "left": {
        "id": "node-4",
        "type": "operand",
        "value": "x",
        "metadata": {
          "operandName": "x",
          "decimal": 42,
          "binary": "00101010"
        }
      },
      "right": {
        "id": "node-5",
        "type": "operand",
        "value": "y",
        "metadata": {
          "operandName": "y",
          "decimal": 27,
          "binary": "00011011"
        }
      }
    },
    "right": {
      "id": "node-3",
      "type": "operator",
      "value": "~",
      "metadata": {
        "operator": "NOT"
      },
      "left": {
        "id": "node-6",
        "type": "operand",
        "value": "x",
        "metadata": {
          "operandName": "x",
          "decimal": 42,
          "binary": "00101010"
        }
      }
    }
  },
  "steps": [...]
}
```

### 备选方案：扁平化结构（如果 LLM 生成困难）

```json
{
  "ast_nodes": [
    {
      "id": "node-1",
      "type": "operator",
      "value": "|",
      "level": 0,
      "position": 0,
      "parentId": null,
      "childrenIds": ["node-2", "node-3"]
    },
    {
      "id": "node-2",
      "type": "operator",
      "value": "&",
      "level": 1,
      "position": 0,
      "parentId": "node-1",
      "childrenIds": ["node-4", "node-5"]
    },
    {
      "id": "node-3",
      "type": "operator",
      "value": "~",
      "level": 1,
      "position": 1,
      "parentId": "node-1",
      "childrenIds": ["node-6"]
    },
    {
      "id": "node-4",
      "type": "operand",
      "value": "x",
      "level": 2,
      "position": 0,
      "parentId": "node-2",
      "childrenIds": []
    },
    {
      "id": "node-5",
      "type": "operand",
      "value": "y",
      "level": 2,
      "position": 1,
      "parentId": "node-2",
      "childrenIds": []
    },
    {
      "id": "node-6",
      "type": "operand",
      "value": "x",
      "level": 2,
      "position": 2,
      "parentId": "node-3",
      "childrenIds": []
    }
  ]
}
```

## 前端改动

### 1. 类型定义更新 (`src/types/bitwise.ts`)

```typescript
export interface ASTNode {
  id: string
  type: 'operator' | 'operand'
  value: string
  level?: number
  children?: ASTNode[]
  left?: ASTNode
  right?: ASTNode
  parentId?: string | null
  metadata?: {
    operator?: string
    operandName?: string
    decimal?: number
    binary?: string
  }
}

export interface BitwiseResponse {
  expression: string
  ast: ASTNode | null  // 替代 ast_nodes: string[]
  ast_nodes?: string[] // 保持向后兼容
  steps: OperationStep[]
}
```

### 2. ASTTree 组件简化

使用结构化数据后，`buildTree` 计算逻辑可以大幅简化：

```typescript
// 直接递归渲染树
function renderNode(node: ASTNode, level: number = 0) {
  return {
    id: node.id,
    value: node.value,
    type: node.type,
    level,
    x: calculateXPosition(node),
    y: level * LEVEL_SPACING,
    children: node.children?.map(child => renderNode(child, level + 1))
  }
}
```

### 3. 布局算法优化

使用真实的树结构后，可以使用标准的树布局算法：
- **Reingold-Tilford 算法**：美观的二叉树布局
- **分层布局**：按层级均匀分布
- **力导向布局**：动态平衡节点位置

## LLM Prompt 建议

### 推荐 Prompt 模板

```
请分析位运算表达式 "{{expression}}" 的抽象语法树 (AST)。

要求：
1. 返回完整的树形结构，包含每个节点的：
   - id: 唯一标识符
   - type: "operator" 或 "operand"
   - value: 节点值（运算符或变量名）
   - left: 左子节点（如果有）
   - right: 右子节点（如果有）
   - metadata: 额外信息（运算符名称、十进制值等）

2. 运算符优先级：
   - ~ (NOT) 优先级最高
   - <<, >> 次之
   - & 再次
   - ^ 再次
   - | 最低

3. 表达式 "{{expression}}" 应该被解析为：
   {{预期的树结构说明}}

请以 JSON 格式返回 AST。
```

### 示例 Prompt

```
请分析位运算表达式 "x & y | ~x" 的抽象语法树。

这个表达式等价于：((x & y) | (~x))

树结构应该是：
- 根节点：| (OR)
  - 左子树：& (AND)
    - 左子节点：x
    - 右子节点：y
  - 右子树：~ (NOT)
    - 子节点：x

请返回完整的 JSON AST 结构。
```

## 过渡策略

### 阶段 1：向后兼容（当前）
- 同时支持 `ast_nodes: string[]` 和 `ast: ASTNode`
- 优先使用 `ast` 字段，如果不存在则回退到旧逻辑

### 阶段 2：推荐新格式
- 在 API 文档中推荐使用 `ast` 格式
- Mock 数据同时提供两种格式

### 阶段 3：完全迁移
- 移除 `ast_nodes` 字段支持
- 所有代码使用新的 ASTNode 类型

## ✅ 已实现的功能

### 前端改进
1. ✅ **改进布局算法**
   - 使用更精确的节点定位
   - 优化层级间距（90px 垂直，80px 水平）

2. ✅ **优化连线渲染**
   - 计算节点中心点
   - 使用正确的父子连接
   - SVG 渐变 + 光晕效果

3. ✅ **添加视觉增强**
   - 连线光晕效果
   - 节点悬停交互（放大 + 发光）
   - 平滑动画过渡

4. ✅ **交互功能**
   - 鼠标滚轮缩放（0.3x - 4x）
   - 自由拖动（grab/grabbing 光标）
   - 重置视图按钮
   - 缩放比例指示器

### 数据结构支持
1. ✅ **双重格式支持**
   - 新格式：`ast: ASTNode`（结构化树）
   - 旧格式：`ast_nodes: string[]`（向后兼容）
   - 优先使用结构化 AST，自动回退

2. ✅ **类型定义**
   - `ASTNode` 接口定义
   - 递归验证函数
   - Mock 数据更新

3. ✅ **API 集成**
   - 更新的 System Prompt
   - 包含 AST 结构示例
   - 支持递归验证

## 性能考虑

- **节点数量限制**：>50 个节点时启用虚拟滚动
- **Canvas 渲染**：节点>100 时考虑使用 Canvas 替代 DOM
- **WebGL 选项**：极端复杂时使用 Three.js

## 使用示例

### Mock 数据（开发/演示）

```typescript
import { mockBitwiseData } from './data/mock'

// 结构化 AST 格式
const ast = mockBitwiseData.ast
// 类型：ASTNode | null

// 旧格式（向后兼容）
const astNodes = mockBitwiseData.ast_nodes
// 类型：string[]
```

### API 响应

LLM 现在会返回包含结构化 AST 的 JSON：

```json
{
  "expression": "x & y | ~x",
  "ast": {
    "id": "node-1",
    "type": "operator",
    "value": "|",
    "metadata": {
      "operator": "OR",
      "description": "按位或运算"
    },
    "left": {
      "id": "node-2",
      "type": "operator",
      "value": "&",
      "metadata": {
        "operator": "AND"
      },
      "left": {
        "id": "node-4",
        "type": "operand",
        "value": "x",
        "metadata": {
          "operandName": "x",
          "decimal": 42,
          "binary": "00101010"
        }
      },
      "right": {
        "id": "node-5",
        "type": "operand",
        "value": "y",
        "metadata": {
          "operandName": "y",
          "decimal": 27,
          "binary": "00011011"
        }
      }
    },
    "right": {
      "id": "node-3",
      "type": "operator",
      "value": "~",
      "metadata": {
        "operator": "NOT"
      },
      "left": {
        "id": "node-6",
        "type": "operand",
        "value": "x",
        "metadata": {
          "operandName": "x",
          "decimal": 42,
          "binary": "00101010"
        }
      }
    }
  },
  "steps": [...]
}
```

### 组件使用

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useBitwiseSession } from './composables/useBitwiseSession'
import ASTTree from './components/ASTTree.vue'

const { currentData, ast, astNodes } = useBitwiseSession()

// 优先使用结构化 AST
const astTree = computed(() => ast.value)
</script>

<template>
  <ASTTree 
    :expression="state.expression"
    :ast="astTree"
    :astNodes="astNodes"
  />
</template>
```

## 总结

**已完成**：
1. ✅ 前端改进的布局算法和交互功能
2. ✅ 双重格式支持（向后兼容）
3. ✅ 类型定义和验证逻辑
4. ✅ API 集成（System Prompt 更新）
5. ✅ Mock 数据更新

**下一步**：
1. 测试真实 API 调用
2. 收集 LLM 返回的结构化 AST 质量
3. 根据需要调整 Prompt
4. 考虑添加更多 AST 元数据支持

**技术优势**：
- 🎯 精确的树形布局（基于真实父子关系）
- 🎨 优秀的视觉效果（光晕、渐变、动画）
- 🔄 向后兼容（旧格式仍然可用）
- 🚀 可扩展（支持更多 AST 属性）
