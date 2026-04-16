export interface Question {
  id: string;
  content: string;
  options?: string[];
  answer: string;
  userAnswer?: string;
  explanation: string;
  knowledgePoint: string;
  subject?: string;
}

export interface SimilarQuestion extends Question {
  commonMistakeAnalysis: string;
}

export interface NotebookEntry {
  id: string;
  originalQuestion: Question;
  similarQuestions: SimilarQuestion[];
  createdAt: number;
}
