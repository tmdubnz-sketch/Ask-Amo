import { Capacitor } from '@capacitor/core';
import { AMO_STARTER_PACKS } from '../data/amoStarterPacks';
import { CURATED_KNOWLEDGE_PACKS } from '../data/curatedKnowledge';
import { AMO_SELF_KNOWLEDGE } from '../data/amoSelfKnowledge';
import { AMO_INSTANT_REPLIES } from '../data/amoInstantReplies';
import { AMO_SEED_PACKS } from '../data/amoSingleSource';
import { buildHelpKnowledgeChunks } from '../data/amoHelpData';
import { vectorDbService } from './vectorDbService';
import { knowledgeStoreService } from './knowledgeStoreService';
import { amoBrainService } from './amoBrainService';

const AMO_COMMUNICATION_STYLE = {
  id: 'amo-communication-style',
  title: 'How Amo communicates — tone, style, and language',
  tags: ['communication', 'style', 'tone', 'language', 'how to talk', 'personality'],
  content: `Amo's communication style:

Tone: Calm, direct, warm. Never robotic. Never over-formal.
Length: Match the question. Short question = short answer. Complex question = fuller answer.
Language: Plain NZ English. Te Reo Maori words used naturally when appropriate.
Never say: "Certainly!", "Of course!", "Great question!", "As an AI", "I apologize".
Always say things plainly: "I don't know" not "I'm unable to ascertain that information".
Greetings: "Kia ora", "Yeah, I'm here", "What do you need?" — never "How may I assist you today?"
When asked to do something: confirm briefly then do it. Don't explain before acting.
When something fails: say what failed and what to try instead. No apologies.
When asked about NZ: speak with familiarity, like someone from here.
Slang: use sparingly and naturally. "Bro" at most once. "Sweet as", "choice", "yeah nah" are fine.`,
};

async function bootstrapCommunicationStyle(): Promise<void> {
  const existingDocs = await knowledgeStoreService.listDocuments();
  const existingDoc = existingDocs.find(doc => doc.document_id === AMO_COMMUNICATION_STYLE.id);
  if (existingDoc) return;

  await knowledgeStoreService.upsertChunk({
    id: AMO_COMMUNICATION_STYLE.id,
    documentId: AMO_COMMUNICATION_STYLE.id,
    documentName: AMO_COMMUNICATION_STYLE.title,
    content: AMO_COMMUNICATION_STYLE.content,
    embedding: new Array(1536).fill(0), // TODO: generate real embeddings
    metadata: {
      assetKind: 'skill',
      source: 'system',
      isSelfKnowledge: true,
    },
  });
  console.info('[AskAmo] Bootstrapped communication style');
}

async function bootstrapSelfKnowledge(): Promise<void> {
  const existingDocs = await knowledgeStoreService.listDocuments();
  
  for (const chunk of AMO_SELF_KNOWLEDGE) {
    const existingDoc = existingDocs.find(doc => doc.document_id === chunk.id);
    if (existingDoc) continue;

    await knowledgeStoreService.upsertChunk({
      id: chunk.id,
      documentId: chunk.id,
      documentName: chunk.title,
      content: `${chunk.title}\nTags: ${chunk.tags.join(', ')}\n\n${chunk.content}`,
      embedding: new Array(1536).fill(0), // TODO: generate real embeddings
      metadata: {
        assetKind: 'skill',
        source: 'system',
        isSelfKnowledge: true,
      },
    });
    console.info(`[AskAmo] Bootstrapped self knowledge: ${chunk.title}`);
  }
}

async function bootstrapHelpKnowledge(): Promise<void> {
  const existingDocs = await knowledgeStoreService.listDocuments();
  const helpChunks = buildHelpKnowledgeChunks();

  for (const chunk of helpChunks) {
    const existingDoc = existingDocs.find(doc => doc.document_id === chunk.id);
    if (existingDoc) continue;

    await knowledgeStoreService.upsertChunk({
      id: chunk.id,
      documentId: chunk.id,
      documentName: chunk.title,
      content: `${chunk.title}\nTags: ${chunk.tags.join(', ')}\n\n${chunk.content}`,
      embedding: new Array(1536).fill(0), // TODO: generate real embeddings
      metadata: {
        assetKind: 'skill',
        source: 'system',
        isSelfKnowledge: true,
      },
    });
    console.info(`[AskAmo] Bootstrapped help knowledge: ${chunk.title}`);
  }
}

async function bootstrapInstantReplies(): Promise<void> {
  const existingDocs = await knowledgeStoreService.listDocuments();

  for (const reply of AMO_INSTANT_REPLIES) {
    const existingDoc = existingDocs.find(doc => doc.document_id === `instant-reply:${reply.id}`);
    if (existingDoc) continue;

    await knowledgeStoreService.upsertChunk({
      id: `instant-reply:${reply.id}`,
      documentId: 'instant-replies',
      documentName: 'Instant Replies',
      content: `Intent: ${reply.id}\nPatterns: ${reply.patterns.join(' | ')}\nReply: ${reply.reply}\nActions: ${reply.actions?.join(', ') || 'none'}\nTags: ${reply.tags.join(', ')}`,
      embedding: new Array(1536).fill(0),
      metadata: {
        assetKind: 'instant-reply',
        source: 'system',
        replyId: reply.id,
        actions: reply.actions || [],
        tags: reply.tags,
      },
    });
    console.info(`[AskAmo] Bootstrapped instant reply: ${reply.id}`);
  }
}

async function bootstrapSingleSource(): Promise<void> {
  const existingDocs = await knowledgeStoreService.listDocuments();

  for (const chunk of AMO_SEED_PACKS) {
    const existingDoc = existingDocs.find(doc => doc.document_id === chunk.id);
    if (existingDoc) continue;

    await knowledgeStoreService.upsertChunk({
      id: chunk.id,
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      content: `${chunk.documentName}\nTags: ${chunk.tags.join(', ')}\nType: ${chunk.kind}\n\n${chunk.content}`,
      embedding: new Array(1536).fill(0),
      metadata: {
        assetKind: 'single-source',
        source: 'system',
        chunkKind: chunk.kind,
        tags: chunk.tags,
      },
    });
    console.info(`[AskAmo] Bootstrapped single-source: ${chunk.id}`);
  }
}

export const knowledgeBootstrapService = {
  async bootstrapAmoBrain(): Promise<void> {
    console.info('[Bootstrap] Starting brain population...');
    console.info('[Bootstrap] Platform:', Capacitor.getPlatform());
    console.info('[Bootstrap] Is native:', Capacitor.isNativePlatform());

    try {
      await knowledgeStoreService.init();
      console.info('[Bootstrap] Knowledge store initialized successfully');
      
      // Check if we're using volatile storage (WASM) on Android
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        const stats = await knowledgeStoreService.getBrainStats();
        
        console.info('[Bootstrap] Current data counts - Documents:', stats.documents, 'Chunks:', stats.chunks, 'Memory notes:', stats.memoryNotes, 'Summaries:', stats.summaries, 'Tools:', stats.tools);
        
        // If we have no data on Android, the persistent storage might not be working
        if (stats.documents === 0 && stats.chunks === 0 && stats.memoryNotes === 0 && stats.summaries === 0 && stats.tools === 0) {
          console.warn('[Bootstrap] No data found on Android - attempting to reset database');
          try {
            // Force re-initialization by clearing and recreating
            console.info('[Bootstrap] Forcing database reinitialization...');
            await knowledgeStoreService.init();
            console.info('[Bootstrap] Database reinitialized');
          } catch (clearError) {
            console.error('[Bootstrap] Failed to reinitialize database:', clearError);
          }
        }
      }
    } catch (e) {
      console.error('[Bootstrap] Failed to initialize knowledge store:', e);
      throw e;
    }
    
    // Check if data already exists
    const existingDocs = await knowledgeStoreService.listDocuments();
    console.info('[Bootstrap] Existing documents count:', existingDocs.length);
    
    const existingMemory = await knowledgeStoreService.listAllConversationMemory();
    console.info('[Bootstrap] Existing memory count:', existingMemory.length);
    
    const existingPacks = await knowledgeStoreService.listSeedPacks();
    console.info('[Bootstrap] Existing seed packs count:', existingPacks.length);

    try {
      await bootstrapSelfKnowledge();
      console.info('[Bootstrap] Self knowledge bootstrapped');
    } catch (e) {
      console.error('[Bootstrap] Self knowledge failed:', e);
    }

    try {
      await bootstrapHelpKnowledge();
      console.info('[Bootstrap] Help knowledge bootstrapped');
    } catch (e) {
      console.error('[Bootstrap] Help knowledge failed:', e);
    }

    try {
      await bootstrapCommunicationStyle();
      console.info('[Bootstrap] Communication style bootstrapped');
    } catch (e) {
      console.error('[Bootstrap] Communication style failed:', e);
    }

    try {
      await this.seedPermanentFacts();
      console.info('[Bootstrap] Permanent facts seeded');
    } catch (e) {
      console.error('[Bootstrap] Permanent facts failed:', e);
    }

    try {
      await this.seedCommunicationExamples();
      console.info('[Bootstrap] Communication examples seeded');
    } catch (e) {
      console.error('[Bootstrap] Communication examples failed:', e);
    }

    try {
      await this.seedStarterPackContent();
      console.info('[Bootstrap] Starter pack content seeded');
    } catch (e) {
      console.error('[Bootstrap] Starter pack content failed:', e);
    }

    try {
      await bootstrapInstantReplies();
      console.info('[Bootstrap] Instant replies seeded');
    } catch (e) {
      console.error('[Bootstrap] Instant replies failed:', e);
    }

    try {
      await bootstrapSingleSource();
      console.info('[Bootstrap] Single source of truth seeded');
    } catch (e) {
      console.error('[Bootstrap] Single source failed:', e);
    }

    // Superbrain packs are already seeded during knowledgeStoreService.init()
    console.info('[Bootstrap] Default superbrain packs already seeded during init');

    // Final counts
    const finalDocs = await knowledgeStoreService.listDocuments();
    const finalMemory = await knowledgeStoreService.listAllConversationMemory();
    const finalPacks = await knowledgeStoreService.listSeedPacks();
    console.info('[Bootstrap] Final counts - Documents:', finalDocs.length, 'Memory:', finalMemory.length, 'Packs:', finalPacks.length);

    console.info('[Bootstrap] Brain population complete.');
  },

  async seedPermanentFacts(): Promise<void> {
    const FACTS = [
      {
        scope: 'app:ask-amo',
        title: 'Amo identity',
        content: 'My name is Amo. I am an AI assistant from Aotearoa New Zealand, created by Te Amo Wilson. My name comes from my creator.',
        tags: ['identity', 'who', 'creator', 'name', 'origin'],
        weight: 10,
      },
      {
        scope: 'app:ask-amo',
        title: 'Amo location',
        content: 'I am from Aotearoa New Zealand. I am grounded in NZ culture, Te Reo Maori, and Waikato-Tainui dialect.',
        tags: ['location', 'nz', 'aotearoa', 'waikato', 'maori'],
        weight: 10,
      },
      {
        scope: 'app:ask-amo',
        title: 'App name',
        content: 'The app is called Ask-Amo. It is a local-first AI assistant that runs on Android.',
        tags: ['app', 'ask-amo', 'android', 'name'],
        weight: 9,
      },
      {
        scope: 'app:ask-amo',
        title: 'Amo capabilities summary',
        content: 'Amo can chat, search the web, run terminal commands, create and edit files, read imported documents, remember conversations, and work offline using a local AI model.',
        tags: ['capabilities', 'what can you do', 'features', 'skills'],
        weight: 9,
      },
      {
        scope: 'app:ask-amo',
        title: 'Offline model',
        content: 'Amo runs offline using a Phi-3.5 Mini 3.8B GGUF model on the device. No internet needed for basic chat.',
        tags: ['offline', 'model', 'gguf', 'phi', 'local'],
        weight: 8,
      },
      {
        scope: 'app:ask-amo',
        title: 'Device',
        content: 'Running on a Samsung S20 5G with Snapdragon 865 and 12GB RAM.',
        tags: ['device', 'samsung', 'android', 'hardware'],
        weight: 8,
      },
      {
        scope: 'app:ask-amo',
        title: 'NZ public holidays',
        content: "New Zealand public holidays: New Year's Day, Day after New Year's, Waitangi Day, Good Friday, Easter Monday, ANZAC Day, King's Birthday, Matariki, Labour Day, Christmas Day, Boxing Day, and regional Anniversary Days.",
        tags: ['nz', 'holidays', 'public holiday', 'new zealand', 'matariki'],
        weight: 7,
      },
      {
        scope: 'app:ask-amo',
        title: 'Te Reo Maori grounding',
        content: 'Use Te Aka Maori Dictionary as authority for Maori words. Waikato-Tainui: wh sounds like f, r is a soft tap, ng as in sing, macron vowels held long.',
        tags: ['maori', 'te reo', 'language', 'pronunciation', 'waikato'],
        weight: 7,
      },
    ];

    for (const fact of FACTS) {
      const existing = await amoBrainService.getConversationMemory(fact.scope);
      if (existing.some(m => m.title === fact.title)) {
        continue;
      }
      await amoBrainService.remember(
        fact.scope,
        fact.title,
        fact.content,
        fact.tags,
        fact.weight,
      );
    }
    console.info(`[Bootstrap] Seeded ${FACTS.length} permanent facts.`);
  },

  async seedCommunicationExamples(): Promise<void> {
    const EXCHANGES = [
      { q: 'kia ora', a: 'Kia ora. What do you need?' },
      { q: 'hey amo', a: "Yeah, I'm here. What do you need?" },
      { q: 'who are you', a: "I'm Amo. AI assistant from Aotearoa, made by Te Amo Wilson. What can I help with?" },
      { q: 'what can you do', a: 'I can chat, search the web, run terminal commands, create files, read your documents, and remember things you tell me. What do you want to do?' },
      { q: 'where are you from', a: "I'm from Aotearoa New Zealand. Made here by Te Amo Wilson." },
      { q: 'open the terminal', a: 'Opening terminal.' },
      { q: 'search for nz news', a: 'Searching now.' },
      { q: 'can you help me code', a: 'Yeah. What are you building?' },
      { q: 'what time is it', a: 'Let me check the device clock for you.' },
      { q: 'thanks', a: 'No worries.' },
      { q: 'cheers bro', a: 'Sweet as.' },
    ];

    const existing = await amoBrainService.getConversationMemory('app:ask-amo');
    for (const ex of EXCHANGES) {
      const title = `Example: ${ex.q}`;
      if (existing.some(m => m.title === title)) {
        continue;
      }
      await amoBrainService.remember(
        'app:ask-amo',
        `Example: ${ex.q}`,
        `User: ${ex.q}\nAmo: ${ex.a}`,
        ['communication', 'example', 'style', 'conversation'],
        9,
      );
    }
    console.info(`[Bootstrap] Seeded ${EXCHANGES.length} communication examples.`);
  },

  async seedStarterPackContent(): Promise<void> {
    const existing = await amoBrainService.getConversationMemory('app:ask-amo');
    for (const pack of AMO_STARTER_PACKS) {
      if (!existing.some(m => m.title === pack.name)) {
        await amoBrainService.remember(
          'app:ask-amo',
          pack.name,
          pack.content,
          ['starter-pack', pack.pillar, pack.key],
          7,
        );
      }

      const docId = `pack:${pack.key}`;
      const docs = await knowledgeStoreService.listDocuments();
      const exists = docs.find(d => d.document_id === docId);
      if (!exists) {
        await knowledgeStoreService.upsertChunk({
          id: docId,
          documentId: docId,
          documentName: pack.name,
          content: pack.content,
          embedding: new Array(1536).fill(0), // TODO: generate real embeddings
          metadata: {
            assetKind: pack.kind,
            source: 'starter-pack',
            starterPackKey: pack.key,
          },
        });
      }
    }
    console.info(`[Bootstrap] Seeded ${AMO_STARTER_PACKS.length} starter packs.`);
  },
};
