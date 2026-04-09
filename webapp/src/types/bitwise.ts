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

export interface BitwiseResponse {
  expression: string;
  ast_nodes: string[];
  steps: OperationStep[];
}
