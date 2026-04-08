export interface DocumentData {
  id: string;
  title: string;
  slug: string;
  content: unknown[];
  wordCount: number;
}

export interface LiveWordCount {
  documentId: string;
  count: number;
}
