import { AMO_STARTER_PACKS } from '../data/amoStarterPacks';
import { CURATED_KNOWLEDGE_PACKS } from '../data/curatedKnowledge';
import { vectorDbService } from './vectorDbService';
import { knowledgeStoreService } from './knowledgeStoreService';

export const knowledgeBootstrapService = {
  /**
   * Bootstraps Amo's brain with core knowledge if it hasn't been done yet
   * or if the version has changed.
   */
  async bootstrapAmoBrain() {
    await vectorDbService.init();
    
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
