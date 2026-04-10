export interface Operand {
  name: string;
  decimal: number;
  binary: string;
}

export interface OperationStep {
  step_id: number;
  operation_name: string;
  expression_part: string;
  explanation: string;
  rule_citation: string;
  operands: Operand[];
  result: Operand;
  highlight_bits: number[];
}

// 新增：结构化 AST 节点类型
export interface ASTNode {
  id: string;
  type: 'operator' | 'operand';
  value: string;
  level?: number;
  position?: number;
  parentId?: string | null;
  childrenIds?: string[];
  left?: ASTNode;
  right?: ASTNode;
  metadata?: {
    operator?: string;
    operandName?: string;
    decimal?: number;
    binary?: string;
    description?: string;
  };
}

export interface BitwiseResponse {
  expression: string;
  // 支持两种格式：向后兼容
  ast_nodes?: string[];
  ast?: ASTNode | null;
  steps: OperationStep[];
}
