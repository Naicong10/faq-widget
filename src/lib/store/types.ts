export type Lead = {
  id: string;
  email: string;
  question: string;
  botAnswer?: string;
  createdAt: string;
};

export interface LeadStore {
  add(lead: Omit<Lead, "id" | "createdAt">): Promise<Lead>;
  list(): Promise<Lead[]>;
}
