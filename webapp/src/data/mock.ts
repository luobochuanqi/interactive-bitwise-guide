import type { BitwiseResponse } from '../types/bitwise'

export const mockBitwiseData: BitwiseResponse = {
  expression: 'x & y | ~x',
  ast_nodes: ['&', '|', '~', 'x', 'y'],
  steps: [
    {
      step_id: 0,
      operation_name: 'Initial State',
      expression_part: 'x & y | ~x',
      explanation: 'Starting values for variables x and y',
      rule_citation: 'Initial',
      operands: [
        {
          name: 'x',
          decimal: 42,
          binary: '00101010'
        },
        {
          name: 'y',
          decimal: 27,
          binary: '00011011'
        }
      ],
      result: {
        name: 'x',
        decimal: 42,
        binary: '00101010'
      },
      highlight_bits: []
    },
    {
      step_id: 1,
      operation_name: 'Bitwise NOT',
      expression_part: '~x',
      explanation: 'Invert all bits of x. Each 0 becomes 1, each 1 becomes 0',
      rule_citation: 'NOT Rule: ~a = ¬a',
      operands: [
        {
          name: 'x',
          decimal: 42,
          binary: '00101010'
        }
      ],
      result: {
        name: '~x',
        decimal: -43,
        binary: '11010101'
      },
      highlight_bits: [0, 2, 4, 6, 7]
    },
    {
      step_id: 2,
      operation_name: 'Bitwise AND',
      expression_part: 'x & y',
      explanation: 'For each bit position, result is 1 only if both corresponding bits are 1',
      rule_citation: 'AND Rule: a & b = 1 iff a=1 and b=1',
      operands: [
        {
          name: 'x',
          decimal: 42,
          binary: '00101010'
        },
        {
          name: 'y',
          decimal: 27,
          binary: '00011011'
        }
      ],
      result: {
        name: 'x & y',
        decimal: 10,
        binary: '00001010'
      },
      highlight_bits: [2, 3, 5]
    },
    {
      step_id: 3,
      operation_name: 'Bitwise OR',
      expression_part: '(x & y) | ~x',
      explanation: 'For each bit position, result is 1 if at least one corresponding bit is 1',
      rule_citation: 'OR Rule: a | b = 1 iff a=1 or b=1',
      operands: [
        {
          name: 'x & y',
          decimal: 10,
          binary: '00001010'
        },
        {
          name: '~x',
          decimal: -43,
          binary: '11010101'
        }
      ],
      result: {
        name: 'result',
        decimal: -37,
        binary: '11011111'
      },
      highlight_bits: [0, 1, 2, 3, 4, 6, 7]
    }
  ]
}

export const mock32BitData: BitwiseResponse = {
  expression: 'x ^ y & ~x',
  ast_nodes: ['^', '&', '~', 'x', 'y'],
  steps: [
    {
      step_id: 0,
      operation_name: 'Initial State',
      expression_part: 'x ^ y & ~x',
      explanation: 'Starting values for 32-bit variables x and y',
      rule_citation: 'Initial',
      operands: [
        {
          name: 'x',
          decimal: 255,
          binary: '00000000000000000000000011111111'
        },
        {
          name: 'y',
          decimal: 15,
          binary: '00000000000000000000000000001111'
        }
      ],
      result: {
        name: 'x',
        decimal: 255,
        binary: '00000000000000000000000011111111'
      },
      highlight_bits: []
    },
    {
      step_id: 1,
      operation_name: 'Bitwise NOT',
      expression_part: '~x',
      explanation: 'Invert all 32 bits of x',
      rule_citation: 'NOT Rule: ~a = ¬a',
      operands: [
        {
          name: 'x',
          decimal: 255,
          binary: '00000000000000000000000011111111'
        }
      ],
      result: {
        name: '~x',
        decimal: -256,
        binary: '11111111111111111111111100000000'
      },
      highlight_bits: Array.from({ length: 24 }, (_, i) => i)
    },
    {
      step_id: 2,
      operation_name: 'Bitwise AND',
      expression_part: 'y & ~x',
      explanation: 'Apply AND between y and ~x. Only positions where both have 1 remain 1',
      rule_citation: 'AND Rule: a & b = 1 iff a=1 and b=1',
      operands: [
        {
          name: 'y',
          decimal: 15,
          binary: '00000000000000000000000000001111'
        },
        {
          name: '~x',
          decimal: -256,
          binary: '11111111111111111111111100000000'
        }
      ],
      result: {
        name: 'y & ~x',
        decimal: 0,
        binary: '00000000000000000000000000000000'
      },
      highlight_bits: [0, 1, 2, 3]
    },
    {
      step_id: 3,
      operation_name: 'Bitwise XOR',
      expression_part: 'x ^ (y & ~x)',
      explanation: 'XOR operation - result is 1 where bits differ, 0 where they match',
      rule_citation: 'XOR Rule: a ^ b = 1 iff a≠b',
      operands: [
        {
          name: 'x',
          decimal: 255,
          binary: '00000000000000000000000011111111'
        },
        {
          name: 'y & ~x',
          decimal: 0,
          binary: '00000000000000000000000000000000'
        }
      ],
      result: {
        name: 'result',
        decimal: 255,
        binary: '00000000000000000000000011111111'
      },
      highlight_bits: []
    }
  ]
}

export default mockBitwiseData
