export type SyntaxKind =
  | 'BreakStatment'
  | 'CallStatment'
  | 'DefStatement'
  | 'VarStatement'
  | 'FailStatement'
  | 'IfStatement'
  | 'LoopStatement'
  | 'ReturnStatement'
  | 'LetStatement';

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
  syntaxKind: 'BreakStatment';
}

export interface CallStatement extends Statement {
  syntaxKind: 'CallStatment';
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
