export interface Note {
  id: number;
  candidateId: number;
  authorId: number | null;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRequest {
  candidateId: number;
  body: string;
}
