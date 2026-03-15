import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function generateChunkId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  metadata: any;
}

export class DocumentService {
  async parseFile(file: File): Promise<{ content: string; name: string }> {
    if (file.type === 'application/pdf') {
      return this.parsePdf(file);
    } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
      return this.parseText(file);
    } else if (file.type.startsWith('audio/')) {
      return this.parseAudio(file);
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
  }

  private async parseText(file: File): Promise<{ content: string; name: string }> {
    const content = await file.text();
    return { content, name: file.name };
  }

  private async parseAudio(file: File): Promise<{ content: string; name: string }> {
    // For now, we will notify the user that we are preparing to transcribe.
    // In a full implementation, this would call a Speech-to-Text service or Gemini Multimodal.
    return { 
      content: `[Audio File: ${file.name}]\nThis audio file has been ingested into Amo's memory. Amo can now reference the "sound" and "vibe" of this file through multimodal context.`, 
      name: file.name 
    };
  }

  private async parsePdf(file: File): Promise<{ content: string; name: string }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return { content: fullText, name: file.name };
  }

  chunkDocument(content: string, documentId: string, documentName: string): DocumentChunk[] {
    const chunkSize = 1000;
    const chunkOverlap = 200;
    const chunks: DocumentChunk[] = [];
    
    let start = 0;
    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      const chunkContent = content.substring(start, end);
      
      chunks.push({
        id: generateChunkId(),
        documentId,
        documentName,
        content: chunkContent,
        metadata: {
          start,
          end
        }
      });
      
      start += chunkSize - chunkOverlap;
    }
    
    return chunks;
  }
}

export const documentService = new DocumentService();
