export interface InterpreterLanguage {
  id: string;
  interpreter_id: string;
  source_language: string;
  target_language: string;
  created_at: string;
}

export interface LanguagePair {
  source: string;
  target: string;
}