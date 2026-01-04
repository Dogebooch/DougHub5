export interface Card {
  id: string
  front: string
  back: string
  noteId: string
  tags: string[]
  dueDate: string
  createdAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  cardIds: string[]
  tags: string[]
  createdAt: string
}
