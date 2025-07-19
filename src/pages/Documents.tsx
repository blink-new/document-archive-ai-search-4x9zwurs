import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Upload, FileText, Search, Filter, Eye, Lock, Users, File } from 'lucide-react'
import { blink } from '@/blink/client'
import type { Document, Project, User } from '@/types'

export function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [visibility, setVisibility] = useState<'private' | 'team'>('team')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'private' | 'team'>('all')
  const [user, setUser] = useState<User | null>(null)

  const getFileIcon = (fileName: string, fileType: string) => {
    const extension = fileName.toLowerCase().split('.').pop()
    
    if (extension === 'pdf' || fileType === 'application/pdf') {
      return <File className="h-6 w-6 text-red-600" />
    } else if (extension === 'doc' || extension === 'docx' || fileType.includes('word')) {
      return <FileText className="h-6 w-6 text-blue-600" />
    } else if (extension === 'txt' || fileType === 'text/plain') {
      return <FileText className="h-6 w-6 text-gray-600" />
    } else if (extension === 'md' || fileType === 'text/markdown') {
      return <FileText className="h-6 w-6 text-green-600" />
    } else {
      return <FileText className="h-6 w-6 text-gray-600" />
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const userData = await blink.auth.me()
      setUser(userData)

      // Load user's projects
      const userProjects = await blink.db.projects.list({
        where: { ownerId: userData.id },
        orderBy: { name: 'asc' }
      })
      setProjects(userProjects)

      // Load user's documents
      const userDocuments = await blink.db.documents.list({
        where: { uploadedBy: userData.id },
        orderBy: { createdAt: 'desc' }
      })
      setDocuments(userDocuments)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log('File selected:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      })
      setSelectedFile(file)
    } else {
      console.log('No file selected')
      setSelectedFile(null)
    }
  }

  const uploadDocument = async () => {
    if (!selectedFile || !selectedProject || !user) {
      console.error('Missing required fields for upload:', { 
        hasFile: !!selectedFile, 
        hasProject: !!selectedProject, 
        hasUser: !!user 
      })
      return
    }

    // Add uploading state
    setUploading(true)

    try {
      console.log('Starting document upload:', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        projectId: selectedProject
      })

      // Validate file before processing
      if (!selectedFile) {
        throw new Error('No file selected')
      }
      
      if (selectedFile.size === 0) {
        throw new Error('Selected file is empty')
      }
      
      if (!selectedFile.name) {
        throw new Error('File name is missing')
      }
      
      // Check if it's a valid File object
      if (!(selectedFile instanceof File)) {
        throw new Error('Invalid file object')
      }

      // Validate file type and size
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'application/rtf'
      ]
      
      const fileExtension = selectedFile.name.toLowerCase().split('.').pop()
      const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf']
      
      if (!allowedExtensions.includes(fileExtension || '')) {
        throw new Error(`Unsupported file type. Please upload: ${allowedExtensions.join(', ').toUpperCase()} files`)
      }

      // Check file size (max 50MB)
      const maxSize = 50 * 1024 * 1024 // 50MB
      if (selectedFile.size > maxSize) {
        throw new Error('File size too large. Maximum size is 50MB')
      }

      // Special handling for PDFs
      if (fileExtension === 'pdf') {
        console.log('Processing PDF file:', selectedFile.name)
        // PDFs are supported by Blink's extractFromBlob function
      }

      // Extract text content from the file
      console.log('Extracting text from file...')
      const text = await blink.data.extractFromBlob(selectedFile)
      console.log('Text extraction successful, length:', text.length)
      
      // Upload the file to storage
      console.log('Uploading file to storage...')
      const { publicUrl } = await blink.storage.upload(
        selectedFile,
        `documents/${selectedProject}/${selectedFile.name}`,
        { upsert: true }
      )
      console.log('File uploaded to storage:', publicUrl)

      // Create document record
      console.log('Creating document record...')
      const document = await blink.db.documents.create({
        name: selectedFile.name,
        content: text,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        projectId: selectedProject,
        uploadedBy: user.id,
        visibility,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      console.log('Document record created:', document.id)

      setDocuments([document, ...documents])
      setSelectedFile(null)
      setSelectedProject('')
      setIsUploadDialogOpen(false)
    } catch (error) {
      console.error('Failed to upload document:', error)
      // Show user-friendly error message
      alert(`Failed to upload document: ${error.message || 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesVisibility = filterVisibility === 'all' || doc.visibility === filterVisibility
    return matchesSearch && matchesVisibility
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading documents...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black">Documents</h1>
          <p className="text-gray-600">Upload and manage your documents across projects.</p>
        </div>
        
        <Dialog open={isUploadDialogOpen} onOpenChange={(open) => {
          setIsUploadDialogOpen(open)
          if (!open) {
            // Reset form when dialog closes
            setSelectedFile(null)
            setSelectedProject('')
            setVisibility('team')
            setUploading(false)
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Upload a document to your project. Supports PDF, Word, and text files. The content will be extracted and processed for AI search.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.PDF,.doc,.docx,.txt,.md,.rtf"
                />
                {selectedFile && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">{selectedFile.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {selectedFile.type || 'Unknown type'} • {(selectedFile.size / 1024).toFixed(1)} KB
                      {selectedFile.name.toLowerCase().endsWith('.pdf') && (
                        <span className="ml-2 text-blue-600">• PDF text extraction supported</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="project">Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="visibility">Visibility</Label>
                <Select value={visibility} onValueChange={(value: 'private' | 'team') => setVisibility(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private (Only you)</SelectItem>
                    <SelectItem value="team">Team (Project members)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsUploadDialogOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={uploadDocument} 
                  disabled={!selectedFile || !selectedProject || uploading}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    'Upload Document'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterVisibility} onValueChange={(value: 'all' | 'private' | 'team') => setFilterVisibility(value)}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="private">Private Only</SelectItem>
            <SelectItem value="team">Team Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {documents.length === 0 ? 'No documents yet' : 'No documents match your search'}
            </h3>
            <p className="text-gray-500 text-center mb-6">
              {documents.length === 0 
                ? 'Upload your first document to get started with AI-powered search. Supports PDF, Word, and text files.'
                : 'Try adjusting your search terms or filters.'
              }
            </p>
            {documents.length === 0 && (
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Your First Document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => {
            const project = projects.find(p => p.id === document.projectId)
            return (
              <Card key={document.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    {getFileIcon(document.name, document.fileType)}
                    <Badge variant={document.visibility === 'private' ? 'secondary' : 'default'}>
                      {document.visibility === 'private' ? (
                        <>
                          <Lock className="h-3 w-3 mr-1" />
                          Private
                        </>
                      ) : (
                        <>
                          <Users className="h-3 w-3 mr-1" />
                          Team
                        </>
                      )}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg truncate">{document.name}</CardTitle>
                  <CardDescription>
                    {project?.name} • {(document.fileSize / 1024).toFixed(1)} KB
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{document.fileType}</span>
                    <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="mr-2 h-4 w-4" />
                    View Document
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}