export interface User {
  id: string
  email: string
  displayName?: string
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

export interface Document {
  id: string
  name: string
  content: string
  fileType: string
  fileSize: number
  projectId: string
  uploadedBy: string
  visibility: 'private' | 'team'
  createdAt: string
  updatedAt: string
}

export interface SearchResult {
  answer: string
  sources: {
    documentId: string
    documentName: string
    relevantText: string
    confidence: number
  }[]
}