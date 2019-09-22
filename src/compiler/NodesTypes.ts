export type SyntaxKind =
  // Statements
  | 'BreakStatement'
  | 'CallStatement'
  | 'DefStatement'
  | 'VarStatement'
  | 'FailStatement'
  | 'IfStatement'
  | 'LoopStatement'
  | 'ReturnStatement'
  | 'LetStatement'
  | 'ModuleStatement'
  //Expressions
  | 'ArrayLiteralExpression'
  | 'FunctionLiteralExpression'
  | 'RecordLiteralExpression'
  | 'BinaryExpression'
  //Literals
  | 'TextLiteral'
  | 'NumberLiteral'
  | 'Identifier';

interface Expression {
  id: string;
  syntaxKind: SyntaxKind;
  line_nr: number;
  column_nr: number;
  column_to: number;
}

export interface Identifier extends Expression {
  syntaxKind: 'Identifier';
}

export interface NumberLiteral extends Expression {
  syntaxKind: 'NumberLiteral';
}

export interface TextLiteral extends Expression {
  syntaxKind: 'TextLiteral';
  text: string;
}

export interface BinaryExpression extends Expression {
  syntaxKind: 'BinaryExpression';
  zeroth: any;
  wunth: any;
}

export interface ArrayLiteralExpression extends Expression {
  syntaxKind: 'ArrayLiteralExpression';
  zeroth: any;
}

export interface RecordLiteralExpression extends Expression {
  syntaxKind: 'RecordLiteralExpression';
  zeroth: any;
}

export interface FunctionLiteralExpression extends Expression {
  syntaxKind: 'FunctionLiteralExpression';
  scope: object;
  zeroth: any;
  wunth: any;
  twoth: any;
  parent: object;
}

export interface BreakStatement extends Statement {
  alphameric: boolean;
  disrupt: true;
  syntaxKind: 'BreakStatement';
}

interface Statement {
  id: string;
  syntaxKind: SyntaxKind;
  line_nr: number;
  column_nr: number;
  column_to: number;
}

export interface BreakStatement extends Statement {
  alphameric: boolean;
  disrupt: true;
  syntaxKind: 'BreakStatement';
}

export interface CallStatement extends Statement {
  syntaxKind: 'CallStatement';
  zeroth: any;
}

export interface DefStatement extends Statement {
  syntaxKind: 'DefStatement';
  zeroth: any;
  wunth: any;
}

export interface VarStatement extends Statement {
  syntaxKind: 'VarStatement';
  zeroth: any;
  wunth: any;
}

export interface FailStatement extends Statement {
  syntaxKind: 'FailStatement';
  disrupt: true;
}

export interface IfStatement extends Statement {
  syntaxKind: 'IfStatement';
  zeroth: any;
  wunth: any;
  twoth: any;
  disrupt: boolean;
  return: boolean;
}

export interface LetStatement extends Statement {
  syntaxKind: 'LetStatement';
  zeroth: any;
  wunth: any;
}

export interface ModuleStatement extends Statement {
  syntaxKind: 'ModuleStatement';
  zeroth: any;
  wunth: any;
}

export interface LoopStatement extends Statement {
  syntaxKind: 'LoopStatement';
  zeroth: any;
  wunth: any;
  disrupt: true;
  return: true;
}

export interface ReturnStatement extends Statement {
  syntaxKind: 'ReturnStatement';
  zeroth: any;
  disrupt: true;
  return: true;
}
