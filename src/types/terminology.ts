
export interface TermSearch {
  id: string;
  user_id: string;
  term: string;
  result: string;
  source_language: string;
  target_language: string;
  created_at: string;
}

export interface SavedTerm extends TermSearch {}

export interface TermSearchRequest {
  term: string;
  sourceLanguage: string;
  targetLanguage: string;
  userId: string;
}

export interface TermSearchResponse {
  result: string;
  term: string;
  sourceLanguage: string;
  targetLanguage: string;
  error?: string;
}
