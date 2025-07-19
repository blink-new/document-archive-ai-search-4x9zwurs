import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Upload, FileText, Search, Filter, Eye, Lock, Users } from 'lucide-react'
import { blink } from '@/blink/client'
import type { Document, Project, User } from '@/types'

export function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [visibility, setVisibility] = useState<'private' | 'team'>('team')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'private' | 'team'>('all')
  const [user, setUser] = useState<User | null>(null)

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
      setSelectedFile(file)
    }
  }

  const uploadDocument = async () => {
    if (!selectedFile || !selectedProject || !user) return

    try {
      // Extract text content from the file
      const text = await blink.data.extractFromBlob(selectedFile)
      
      // Upload the file to storage
      const { publicUrl } = await blink.storage.upload(
        selectedFile,
        `documents/${selectedProject}/${selectedFile.name}`,
        { upsert: true }
      )

      // Create document record
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

      setDocuments([document, ...documents])
      setSelectedFile(null)
      setSelectedProject('')
      setIsUploadDialogOpen(false)
    } catch (error) {
      console.error('Failed to upload document:', error)
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
                Upload a document to your project. The content will be processed for AI search.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.md"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
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
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={uploadDocument} 
                  disabled={!selectedFile || !selectedProject}
                >
                  Upload Document
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
                ? 'Upload your first document to get started with AI-powered search.'
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
                    <FileText className="h-6 w-6 text-gray-600" />
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