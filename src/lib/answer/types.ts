export type ChatResponse = {
  answer: string;
  handoff: boolean;
  sources: string[];
  suggestions?: string[];
};

export interface AnswerEngine {
  answer(question: string): Promise<ChatResponse>;
}
