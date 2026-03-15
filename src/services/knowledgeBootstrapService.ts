import { AMO_STARTER_PACKS } from '../data/amoStarterPacks';
import { CURATED_KNOWLEDGE_PACKS } from '../data/curatedKnowledge';
import { AMO_SELF_KNOWLEDGE } from '../data/amoSelfKnowledge';
import { buildHelpKnowledgeChunks } from '../data/amoHelpData';
import { vectorDbService } from './vectorDbService';
import { knowledgeStoreService } from './knowledgeStoreService';

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

const SEED_EXCHANGES = [
  { q: 'kia ora', a: 'Kia ora. What do you need?' },
  { q: 'what can you do', a: 'I can chat, search the web, run commands, create files, and remember things. What do you want to do?' },
  { q: 'open the terminal', a: 'Opening terminal.' },
  { q: 'search for nz news', a: 'Searching now.' },
  { q: 'who are you', a: "I'm Amo. AI assistant from Aotearoa, made by Te Amo Wilson. What do you need?" },
  { q: 'can you help me code', a: 'Yeah. What are you building?' },
];

async function bootstrapCommunicationStyle(): Promise<void> {
  const existingDocs = await knowledgeStoreService.listDocuments();
  const existingDoc = existingDocs.find(doc => doc.document_id === AMO_COMMUNICATION_STYLE.id);
  if (existingDoc) return;

  await vectorDbService.addDocument({
    id: AMO_COMMUNICATION_STYLE.id,
    documentId: AMO_COMMUNICATION_STYLE.id,
    documentName: AMO_COMMUNICATION_STYLE.title,
    content: AMO_COMMUNICATION_STYLE.content,
    metadata: {
      assetKind: 'skill',
      source: 'system',
      isSelfKnowledge: true,
    },
  });
  console.info('[AskAmo] Bootstrapped communication style');

  for (const ex of SEED_EXCHANGES) {
    await vectorDbService.addDocument({
      id: `seed-exchange-${ex.q.replace(/\s+/g, '-')}`,
      documentId: 'amo-seed-exchanges',
      documentName: 'Example exchanges',
      content: `User: ${ex.q}\nAmo: ${ex.a}`,
      metadata: {
        assetKind: 'skill',
        source: 'system',
        tags: ['communication', 'example', 'style'],
        weight: 9,
      },
    });
  }
  console.info(`[AskAmo] Bootstrapped ${SEED_EXCHANGES.length} seed exchanges`);
}

async function bootstrapSelfKnowledge(): Promise<void> {
  const existingDocs = await knowledgeStoreService.listDocuments();
  
  for (const chunk of AMO_SELF_KNOWLEDGE) {
    const existingDoc = existingDocs.find(doc => doc.document_id === chunk.id);
    if (existingDoc) continue;

    await vectorDbService.addDocument({
      id: chunk.id,
      documentId: chunk.id,
      documentName: chunk.title,
      content: `${chunk.title}\nTags: ${chunk.tags.join(', ')}\n\n${chunk.content}`,
      metadata: {
        assetKind: 'skill',
        source: 'system',
        isSelfKnowledge: true,
      },
    });
    console.info(`[AskAmo] Bootstrapped self-knowledge: ${chunk.title}`);
  }
}

async function bootstrapHelpKnowledge(): Promise<void> {
  const existingDocs = await knowledgeStoreService.listDocuments();
  const helpChunks = buildHelpKnowledgeChunks();

  for (const chunk of helpChunks) {
    const existingDoc = existingDocs.find(doc => doc.document_id === chunk.id);
    if (existingDoc) continue;

    await vectorDbService.addDocument({
      id: chunk.id,
      documentId: chunk.id,
      documentName: chunk.title,
      content: `${chunk.title}\nTags: ${chunk.tags.join(', ')}\n\n${chunk.content}`,
      metadata: {
        assetKind: 'skill',
        source: 'system',
        isSelfKnowledge: true,
      },
    });
    console.info(`[AskAmo] Bootstrapped help knowledge: ${chunk.title}`);
  }
}

export const knowledgeBootstrapService = {
  /**
   * Bootstraps Amo's brain with core knowledge if it hasn't been done yet
   * or if the version has changed.
   */
  async bootstrapAmoBrain() {
    await vectorDbService.init();
    
    // First, load Amo's self-knowledge
    await bootstrapSelfKnowledge();

    // Load help commands and templates
    await bootstrapHelpKnowledge();

    // Load communication style and seed exchanges
    await bootstrapCommunicationStyle();
    
    // Get currently installed documents
    const existingDocs = await knowledgeStoreService.listDocuments();
    
    for (const pack of [...AMO_STARTER_PACKS, ...CURATED_KNOWLEDGE_PACKS]) {
      const existingDoc = existingDocs.find(doc => doc.document_id === pack.key);
      const needsUpdate = !existingDoc || existingDoc.starter_pack_version !== pack.version;
      
      if (needsUpdate) {
        if (existingDoc) {
          console.info(`[AskAmo] Updating core knowledge to v${pack.version}: ${pack.name}`);
          // Remove old version first to avoid chunk duplication if structure changed
          await vectorDbService.removeDocument(pack.key);
        } else {
          console.info(`[AskAmo] Bootstrapping core knowledge v${pack.version}: ${pack.name}`);
        }

        const metadataSource = CURATED_KNOWLEDGE_PACKS.some((curated) => curated.key === pack.key) ? 'curated' : 'starter-pack';

        await vectorDbService.addDocument({
          id: pack.key,
          documentId: pack.key,
          documentName: pack.name,
          content: pack.content,
          metadata: {
            assetKind: pack.kind,
            source: metadataSource,
            pillar: pack.pillar,
            starterPackKey: pack.key,
            starterPackVersion: pack.version
          }
        });
      }
      }

    console.info('[AskAmo] Core knowledge bootstrap synchronization complete.');
  }
};
