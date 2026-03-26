import { pipeline, env } from '@xenova/transformers';
import { knowledgeStoreService } from './knowledgeStoreService';
import { useRagSettingsStore } from '../stores/ragSettingsStore';

// Configure transformers.js for local use
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface VectorDocument {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  embedding: number[];
  metadata: any;
}

export class VectorDbService {
  private extractor: any = null;
  private documents: VectorDocument[] = [];
  private isInitialized: boolean = false;

  async init() {
    if (this.isInitialized) return;
    
    // Use a small, efficient model for embeddings
    this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    this.isInitialized = true;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized) await this.init();
    
    const output = await this.extractor(text, {
      pooling: 'mean',
      normalize: true,
    });
    
    return Array.from(output.data);
  }

  async addDocument(doc: Omit<VectorDocument, 'embedding'>) {
    const embedding = await this.generateEmbedding(doc.content);
    const fullDoc = { ...doc, embedding };
    await knowledgeStoreService.upsertChunk(fullDoc);

    const existingIndex = this.documents.findIndex((item) => item.id === fullDoc.id);
    if (existingIndex >= 0) {
      this.documents[existingIndex] = fullDoc;
    } else {
      this.documents.push(fullDoc);
    }
  }

  async loadFromStorage() {
    const storedChunks = await knowledgeStoreService.listChunks();
    this.documents = storedChunks.map((chunk) => ({
      id: chunk.id,
      documentId: chunk.document_id,
      documentName: chunk.document_name,
      content: chunk.content,
      embedding: JSON.parse(chunk.embedding_json) as number[],
      metadata: JSON.parse(chunk.metadata_json) as Record<string, unknown>,
    }));
  }

  async removeDocument(documentId: string) {
    this.documents = this.documents.filter(doc => doc.documentId !== documentId);
    await knowledgeStoreService.deleteDocument(documentId);
  }

  async search(query: string, limit?: number): Promise<VectorDocument[]> {
    if (!this.isInitialized) await this.init();
    
    const settings = useRagSettingsStore.getState();
    const topK = limit ?? settings.topK;
    const threshold = settings.relevanceThreshold;
    
    let results: VectorDocument[];
    
    if (settings.hybridSearch) {
      results = await this.hybridSearch(query, topK);
    } else {
      const queryEmbedding = await this.generateEmbedding(query);
      results = this.documents
        .map(doc => ({
          ...doc,
          similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
    }
    
    return results.filter(doc => (doc as any).similarity >= threshold);
  }

  private async hybridSearch(query: string, limit: number): Promise<VectorDocument[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const keywordTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    const scored = this.documents.map(doc => {
      let keywordScore = 0;
      if (keywordTerms.length > 0) {
        const contentLower = doc.content.toLowerCase();
        for (const term of keywordTerms) {
          if (contentLower.includes(term)) {
            keywordScore += 1 / keywordTerms.length;
          }
        }
      }
      
      const semanticScore = this.cosineSimilarity(queryEmbedding, doc.embedding);
      const combinedScore = (keywordScore * 0.3) + (semanticScore * 0.7);
      
      return { ...doc, similarity: combinedScore };
    });
    
    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  clear() {
    this.documents = [];
    return knowledgeStoreService.clearKnowledge();
  }

  getDocuments() {
    return this.documents;
  }

  getStats() {
    const docMap = new Map<string, { name: string; chunks: number }>();
    for (const doc of this.documents) {
      const existing = docMap.get(doc.documentId);
      if (existing) {
        existing.chunks++;
      } else {
        docMap.set(doc.documentId, { name: doc.documentName, chunks: 1 });
      }
    }
    return {
      totalDocuments: docMap.size,
      totalChunks: this.documents.length,
      documents: Array.from(docMap.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        chunks: data.chunks,
      })),
    };
  }

  async deleteDocument(documentId: string) {
    this.documents = this.documents.filter(doc => doc.documentId !== documentId);
    await knowledgeStoreService.deleteDocument(documentId);
  }
}

export const vectorDbService = new VectorDbService();
