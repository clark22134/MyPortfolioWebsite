export interface Tag {
  id: number;
  name: string;
  color: string | null;
}

export interface TagRequest {
  name: string;
  color?: string;
}
