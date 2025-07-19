import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Search, FileText, Sparkles, ExternalLink } from 'lucide-react'
import { blink } from '@/blink/client'
import type { Document, SearchResult, User } from '@/types'

export function AISearch() {
  const [query, setQuery] = useState('')
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    loadUserDocuments()
  }, [])

  const loadUserDocuments = async () => {
    try {
      const userData = await blink.auth.me()
      setUser(userData)

      // Load all documents the user has access to
      const userDocuments = await blink.db.documents.list({
        where: { uploadedBy: userData.id },
        orderBy: { createdAt: 'desc' }
      })
      setDocuments(userDocuments)
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  const performSearch = async () => {
    if (!query.trim() || documents.length === 0) return

    setLoading(true)
    try {
      // Combine all document content for AI search
      const documentContext = documents.map(doc => 
        `Document: ${doc.name}\nContent: ${doc.content}\n---`
      ).join('\n')

      // Use AI to answer the question based on document content
      const { text } = await blink.ai.generateText({
        prompt: `Based on the following documents, answer this question: "${query}"

Documents:
${documentContext}

Please provide a comprehensive answer and indicate which documents you referenced. If the answer cannot be found in the documents, say so clearly.`,
        maxTokens: 1000
      })

      // Find relevant documents based on keywords in the query
      const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 3)
      const relevantDocs = documents.filter(doc => {
        const content = doc.content.toLowerCase()
        return queryWords.some(word => content.includes(word))
      }).slice(0, 5) // Limit to top 5 relevant documents

      const result: SearchResult = {
        answer: text,
        sources: relevantDocs.map(doc => ({
          documentId: doc.id,
          documentName: doc.name,
          relevantText: doc.content.substring(0, 200) + '...',
          confidence: 0.8 // Simplified confidence score
        }))
      }

      setSearchResult(result)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      performSearch()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black">AI Search</h1>
        <p className="text-gray-600">Ask questions about your documents and get AI-powered answers with source attribution.</p>
      </div>

      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5" />
            Ask a Question
          </CardTitle>
          <CardDescription>
            Ask any question about your uploaded documents. The AI will search through your content and provide answers with sources.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="What would you like to know about your documents? (e.g., 'What are the main findings in the research papers?', 'Summarize the project requirements', etc.)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {documents.length} documents available for search
            </p>
            <Button 
              onClick={performSearch} 
              disabled={!query.trim() || loading || documents.length === 0}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* No Documents State */}
      {documents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents to search</h3>
            <p className="text-gray-500 text-center mb-6">
              Upload some documents first to start using AI search.
            </p>
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Go to Documents
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResult && (
        <div className="space-y-6">
          {/* AI Answer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-blue-600" />
                AI Answer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {searchResult.answer}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Source Documents */}
          {searchResult.sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Source Documents
                </CardTitle>
                <CardDescription>
                  Documents that contributed to this answer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchResult.sources.map((source, index) => {
                    const document = documents.find(doc => doc.id === source.documentId)
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-gray-600" />
                            <h4 className="font-medium text-black">{source.documentName}</h4>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {Math.round(source.confidence * 100)}% match
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {document?.visibility === 'private' ? 'Private' : 'Team'} • 
                          {document && ` ${(document.fileSize / 1024).toFixed(1)} KB`}
                        </p>
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-sm text-gray-700 italic">
                            "{source.relevantText}"
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Example Queries */}
      {!searchResult && documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Example Questions</CardTitle>
            <CardDescription>Try asking these types of questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "What are the main topics covered in my documents?",
                "Summarize the key findings from the research papers",
                "What are the project requirements mentioned?",
                "List all the action items from meeting notes",
                "What are the common themes across all documents?",
                "Find information about budget or costs"
              ].map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="text-left justify-start h-auto p-3"
                  onClick={() => setQuery(example)}
                >
                  <span className="text-sm">{example}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}