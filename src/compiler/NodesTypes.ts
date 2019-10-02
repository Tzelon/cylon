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
  | 'Identifier'
  //General
  | 'RecordProperty';

interface Loc {
  identifierName?: string;
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
}

// ======================== Generals ========================

interface General {
  syntaxKind: SyntaxKind;
}

export interface RecordProperty extends General {
  syntaxKind: 'RecordProperty';
}

// ======================== Expressions ========================

interface Expression {
  id: string;
  syntaxKind: SyntaxKind;
  loc: Loc;
}

export interface Identifier extends Expression {
  syntaxKind: 'Identifier';
  parents?: string[];
}

export interface NumberLiteral extends Expression {
  syntaxKind: 'NumberLiteral';
  number: any;
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

// ======================== Statement ========================

interface Statement {
  id: string;
  syntaxKind: SyntaxKind;
  loc: Loc;
}

export interface BreakStatement extends Statement {
  alphameric: boolean;
  disrupt: true;
  syntaxKind: 'BreakStatement';
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
  parent: any;
  zeroth: any;
  wunth: any;
  front_matter: Map<string, any>;
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
