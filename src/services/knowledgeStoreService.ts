import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import {
  type AsyncSQLiteDb,
  WasmSQLiteAdapter,
  CapacitorSQLiteAdapter,
  isNativeSQLiteAvailable,
} from './sqliteAdapter';

type SQLiteDb = {
  exec: (arg: string | { sql: string; bind?: unknown[] | Record<string, unknown>; rowMode?: 'object' | 'array'; returnValue?: 'resultRows'; resultRows?: unknown[] }) => unknown;
  selectObjects: <T>(sql: string, bind?: unknown[] | Record<string, unknown>) => T[];
  transaction: <T>(callback: () => T) => T;
};

type SQLiteModule = {
  oo1: {
    DB: new (filename: string, flags?: string) => SQLiteDb;
    JsStorageDb?: new (storageName?: string) => SQLiteDb;
  };
};

export interface KnowledgeDocumentRow {
  document_id: string;
  document_name: string;
  asset_kind: string;
  source: string;
  starter_pack_key: string | null;
  starter_pack_version: string | null;
  starter_pack_category: string | null;
  chunk_count: number;
  updated_at: number;
  created_at?: number;
}

export interface KnowledgeChunkRow {
  id: string;
  document_id: string;
  document_name: string;
  content: string;
  embedding_json: string;
  metadata_json: string;
  asset_kind: string;
  source: string;
  starter_pack_key: string | null;
  starter_pack_version: string | null;
  starter_pack_category: string | null;
  updated_at: number;
  created_at?: number;
}

export interface ConversationMemoryRow {
  id: string;
  scope: string;
  memory_type: string;
  title: string;
  content: string;
  tags_json: string;
  weight: number;
  created_at: number;
  updated_at: number;
}

export interface MemorySummaryRow {
  id: string;
  scope: string;
  source_type: string;
  source_id: string;
  summary: string;
  keywords_json: string;
  created_at: number;
  updated_at: number;
}

export interface ToolRegistryRow {
  tool_id: string;
  display_name: string;
  description: string;
  capability_group: string;
  enabled: number;
  input_schema_json: string;
  policy_json: string;
  created_at: number;
  updated_at: number;
}

export interface SeedPackRow {
  pack_id: string;
  pack_name: string;
  pack_type: string;
  version: string;
  description: string;
  payload_json: string;
  enabled: number;
  created_at: number;
  updated_at: number;
}

export interface NativePiperVoicePackRow {
  voiceId: string;
  displayName: string;
  ready: boolean;
  fileKinds: string[];
  files: string[];
  sizeBytes: number;
}

const SCHEMA_VERSION = 2;
const LEGACY_VECTOR_STORAGE_KEY = 'vector_db_docs';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function parseJsonOrDefault<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('[AskAmo] Failed to parse stored JSON payload', error);
    return fallback;
  }
}

export class KnowledgeStoreService {
  private sqlite: SQLiteModule | null = null;
  private db: AsyncSQLiteDb | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    if (!this.initPromise) {
      this.initPromise = this.initializeInternal().catch((err) => {
        this.initPromise = null;
        throw err;
      });
    }

    await this.initPromise;
  }

  private async initializeInternal(): Promise<void> {
    let db: AsyncSQLiteDb;

    if (isNativeSQLiteAvailable()) {
      // On native Android, use Capacitor SQLite plugin — data persists in
      // /data/data/<package>/databases/ and survives restarts & redeploys.
      console.log('[KnowledgeStore] Native SQLite available, using Capacitor plugin');
      try {
        const adapter = new CapacitorSQLiteAdapter();
        await adapter.open();
        db = adapter;
        console.log('[KnowledgeStore] Capacitor SQLite adapter opened successfully');
      } catch (e) {
        console.error('[KnowledgeStore] Failed to open Capacitor SQLite:', e);
        throw e;
      }
    } else {
      // Browser path: use SQLite WASM with localStorage-backed storage
      const sqlite = await sqlite3InitModule() as unknown as SQLiteModule;
      this.sqlite = sqlite;

      let rawDb: SQLiteDb;
      if (sqlite.oo1.JsStorageDb && isBrowser()) {
        console.log('[KnowledgeStore] Using localStorage-backed SQLite (browser)');
        rawDb = new sqlite.oo1.JsStorageDb('amo-knowledge-store');
      } else {
        console.log('[KnowledgeStore] Using fallback file-based SQLite');
        rawDb = new sqlite.oo1.DB('/amo-knowledge.sqlite3', 'ct');
      }
      db = new WasmSQLiteAdapter(rawDb as any);
    }

    try {
      // PRAGMAs must run individually — capacitor-sqlite's execute() cannot
      // mix PRAGMAs with DDL in a single batch reliably.
      await db.exec('PRAGMA journal_mode = WAL;');
      await db.exec('PRAGMA synchronous = NORMAL;');
      await db.exec('PRAGMA temp_store = MEMORY;');
      await db.exec('PRAGMA foreign_keys = ON;');

      // DDL batch — CREATE TABLE / CREATE INDEX
      await db.exec(`
        CREATE TABLE IF NOT EXISTS app_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      await db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_documents (
          document_id TEXT PRIMARY KEY,
          document_name TEXT NOT NULL,
          asset_kind TEXT NOT NULL,
          source TEXT NOT NULL,
          starter_pack_key TEXT,
          starter_pack_version TEXT,
          starter_pack_category TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      await db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL,
          document_name TEXT NOT NULL,
          content TEXT NOT NULL,
          embedding_json TEXT NOT NULL,
          metadata_json TEXT NOT NULL,
          asset_kind TEXT NOT NULL,
          source TEXT NOT NULL,
          starter_pack_key TEXT,
          starter_pack_version TEXT,
          starter_pack_category TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (document_id) REFERENCES knowledge_documents(document_id) ON DELETE CASCADE
        );
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_knowledge_documents_updated_at ON knowledge_documents(updated_at DESC);');
      await db.exec(`
        CREATE TABLE IF NOT EXISTS conversation_memory (
          id TEXT PRIMARY KEY,
          scope TEXT NOT NULL,
          memory_type TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          tags_json TEXT NOT NULL,
          weight REAL NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_conversation_memory_scope ON conversation_memory(scope, updated_at DESC);');
      await db.exec(`
        CREATE TABLE IF NOT EXISTS memory_summaries (
          id TEXT PRIMARY KEY,
          scope TEXT NOT NULL,
          source_type TEXT NOT NULL,
          source_id TEXT NOT NULL,
          summary TEXT NOT NULL,
          keywords_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_memory_summaries_scope ON memory_summaries(scope, updated_at DESC);');
      await db.exec(`
        CREATE TABLE IF NOT EXISTS tool_registry (
          tool_id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          description TEXT NOT NULL,
          capability_group TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          input_schema_json TEXT NOT NULL,
          policy_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      await db.exec(`
        CREATE TABLE IF NOT EXISTS seed_packs (
          pack_id TEXT PRIMARY KEY,
          pack_name TEXT NOT NULL,
          pack_type TEXT NOT NULL,
          version TEXT NOT NULL,
          description TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      await db.exec({
        sql: `
          INSERT INTO app_meta(key, value)
          VALUES('schema_version', ?1)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `,
        bind: [String(SCHEMA_VERSION)],
      });

      await this.migrateLegacyVectors(db);
      console.log('[KnowledgeStore] Legacy vectors migrated');
      
      await this.seedDefaultToolRegistry(db);
      console.log('[KnowledgeStore] Tool registry seeded');
      
      await this.seedDefaultKnowledgePacks(db);
      console.log('[KnowledgeStore] Default knowledge packs seeded');

      this.db = db;
      console.log('[KnowledgeStore] Database initialization complete');
    } catch (error) {
      throw error;
    }
  }

  private async migrateLegacyVectors(db: AsyncSQLiteDb): Promise<void> {
    if (!isBrowser()) {
      return;
    }

    const rows = await db.selectObjects<{ value: string }>(
      `SELECT value FROM app_meta WHERE key = 'legacy_vector_db_migrated'`
    );
    if (rows[0]?.value === 'true') {
      return;
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_VECTOR_STORAGE_KEY);
    if (!legacyRaw) {
      await this.markLegacyMigrationComplete(db);
      return;
    }

    const legacyDocs = parseJsonOrDefault<Array<{
      id: string;
      documentId: string;
      documentName: string;
      content: string;
      embedding: number[];
      metadata: Record<string, unknown>;
    }>>(legacyRaw, []);

    if (legacyDocs.length === 0) {
      window.localStorage.removeItem(LEGACY_VECTOR_STORAGE_KEY);
      await this.markLegacyMigrationComplete(db);
      return;
    }

    const now = Date.now();
    await db.transaction(async () => {
      for (const doc of legacyDocs) {
        const metadata = doc.metadata || {};
        await db.exec({
          sql: `
            INSERT INTO knowledge_documents (
              document_id, document_name, asset_kind, source,
              starter_pack_key, starter_pack_version, starter_pack_category,
              created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(document_id) DO UPDATE SET
              document_name = excluded.document_name,
              asset_kind = excluded.asset_kind,
              source = excluded.source,
              starter_pack_key = excluded.starter_pack_key,
              starter_pack_version = excluded.starter_pack_version,
              starter_pack_category = excluded.starter_pack_category,
              updated_at = excluded.updated_at
          `,
          bind: [
            doc.documentId,
            doc.documentName,
            String(metadata.assetKind || 'document'),
            String(metadata.source || 'user'),
            metadata.starterPackKey ? String(metadata.starterPackKey) : null,
            metadata.starterPackVersion ? String(metadata.starterPackVersion) : null,
            metadata.starterPackCategory ? String(metadata.starterPackCategory) : null,
            now,
            now,
          ],
        });

        await db.exec({
          sql: `
            INSERT INTO knowledge_chunks (
              id, document_id, document_name, content, embedding_json, metadata_json,
              asset_kind, source, starter_pack_key, starter_pack_version, starter_pack_category,
              created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
            ON CONFLICT(id) DO UPDATE SET
              content = excluded.content,
              embedding_json = excluded.embedding_json,
              metadata_json = excluded.metadata_json,
              updated_at = excluded.updated_at
          `,
          bind: [
            doc.id,
            doc.documentId,
            doc.documentName,
            doc.content,
            JSON.stringify(doc.embedding),
            JSON.stringify(metadata),
            String(metadata.assetKind || 'document'),
            String(metadata.source || 'user'),
            metadata.starterPackKey ? String(metadata.starterPackKey) : null,
            metadata.starterPackVersion ? String(metadata.starterPackVersion) : null,
            metadata.starterPackCategory ? String(metadata.starterPackCategory) : null,
            now,
            now,
          ],
        });
      }
    });

    window.localStorage.removeItem(LEGACY_VECTOR_STORAGE_KEY);
    await this.markLegacyMigrationComplete(db);
  }

  private async markLegacyMigrationComplete(db: AsyncSQLiteDb): Promise<void> {
    await db.exec({
      sql: `
        INSERT INTO app_meta(key, value)
        VALUES('legacy_vector_db_migrated', 'true')
        ON CONFLICT(key) DO UPDATE SET value = 'true'
      `,
    });
  }

  private async seedDefaultToolRegistry(db: AsyncSQLiteDb): Promise<void> {
    const now = Date.now();
    const defaultTools = [
      {
        toolId: 'knowledge.search',
        displayName: 'Knowledge Search',
        description: 'Search imported knowledge chunks and starter packs.',
        capabilityGroup: 'knowledge',
        inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] },
        policy: { requiresUserAction: false, offline: true, latencyTier: 'fast' },
      },
      {
        toolId: 'knowledge.import',
        displayName: 'Knowledge Import',
        description: 'Import documents, skill packs, and datasets into Amo knowledge storage.',
        capabilityGroup: 'knowledge',
        inputSchema: { type: 'object', properties: { kind: { type: 'string' }, source: { type: 'string' } }, required: ['kind'] },
        policy: { requiresUserAction: true, offline: true, latencyTier: 'background' },
      },
      {
        toolId: 'memory.read',
        displayName: 'Memory Read',
        description: 'Read indexed conversation memory and summaries.',
        capabilityGroup: 'memory',
        inputSchema: { type: 'object', properties: { scope: { type: 'string' } }, required: ['scope'] },
        policy: { requiresUserAction: false, offline: true, latencyTier: 'instant' },
      },
      {
        toolId: 'memory.write',
        displayName: 'Memory Write',
        description: 'Write durable memory summaries and user preferences.',
        capabilityGroup: 'memory',
        inputSchema: { type: 'object', properties: { scope: { type: 'string' }, content: { type: 'string' } }, required: ['scope', 'content'] },
        policy: { requiresUserAction: false, offline: true, latencyTier: 'background' },
      },
      {
        toolId: 'web.search',
        displayName: 'Web Search',
        description: 'Search the web for current links and summaries.',
        capabilityGroup: 'web',
        inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] },
        policy: { requiresUserAction: false, offline: false, latencyTier: 'fast' },
      },
      {
        toolId: 'web.read',
        displayName: 'Web Read',
        description: 'Fetch a web page and extract readable text from it.',
        capabilityGroup: 'web',
        inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
        policy: { requiresUserAction: false, offline: false, latencyTier: 'fast' },
      },
      {
        toolId: 'web.import',
        displayName: 'Web Import',
        description: 'Import a web page into Amo knowledge storage for later retrieval.',
        capabilityGroup: 'web',
        inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
        policy: { requiresUserAction: true, offline: false, latencyTier: 'background' },
      },
       {
         toolId: 'web.open',
         displayName: 'Web Open',
         description: 'Open or navigate the in-app webview to a URL for research and task execution.',
         capabilityGroup: 'web',
         inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
         policy: { requiresUserAction: false, offline: false, latencyTier: 'instant' },
       },
       {
         toolId: 'terminal.exec',
         displayName: 'Terminal Execute',
         description: 'Execute real terminal commands in Amo workspace, maintain working directory, and return stdout/stderr.',
         capabilityGroup: 'system',
         inputSchema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
         policy: { requiresUserAction: false, offline: false, latencyTier: 'fast' },
       },
    ];

    await db.transaction(async () => {
      for (const tool of defaultTools) {
        await db.exec({
          sql: `
            INSERT INTO tool_registry (
              tool_id, display_name, description, capability_group, enabled,
              input_schema_json, policy_json, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7, ?8)
            ON CONFLICT(tool_id) DO UPDATE SET
              display_name = excluded.display_name,
              description = excluded.description,
              capability_group = excluded.capability_group,
              input_schema_json = excluded.input_schema_json,
              policy_json = excluded.policy_json,
              updated_at = excluded.updated_at
          `,
          bind: [
            tool.toolId,
            tool.displayName,
            tool.description,
            tool.capabilityGroup,
            JSON.stringify(tool.inputSchema),
            JSON.stringify(tool.policy),
            now,
            now,
          ],
        });
      }
    });
  }

  private async seedDefaultKnowledgePacks(db: AsyncSQLiteDb): Promise<void> {
    const now = Date.now();
    const packs = [
      {
        packId: 'amo.superbrain.core',
        packName: 'Superbrain Core',
        packType: 'superbrain',
        version: '2',
        description: 'Core reasoning engine — chain-of-thought, builder integration, and adaptive response patterns.',
        payload: {
          reasoning: {
            method: 'chain-of-thought',
            steps: ['UNDERSTAND', 'DECOMPOSE', 'RETRIEVE', 'REASON', 'SYNTHESIZE', 'VERIFY'],
            rules: [
              'For simple questions, answer directly — do not over-reason.',
              'For complex questions, show reasoning steps before the answer.',
              'Always check builder state and knowledge context before answering.',
              'If data is missing, say so — never fabricate.',
              'Use builder tools to generate variations, count options, and enhance intent.',
            ],
          },
          style: 'direct-grounded-practical',
          adaptiveLength: {
            short: 'Simple factual answer, one to two sentences.',
            medium: 'Clear explanation with context, three to five sentences.',
            full: 'Step-by-step reasoning with examples and builder data.',
          },
        },
      },
      {
        packId: 'amo.superbrain.builders',
        packName: 'Builder Integration',
        packType: 'superbrain',
        version: '2',
        description: 'Patterns for reading, writing, and reasoning over Vocabulary Builder, Sentence Builder, and Intent Enhancer.',
        payload: {
          tools: [
            {
              name: 'Vocabulary Builder',
              capabilities: ['list words', 'add word', 'check mastery', 'generate vocabulary set', 'review words'],
              stateFields: ['totalWords', 'masteredWords', 'learningWords', 'averageMastery'],
              usageHint: 'When user asks about vocabulary, read builder state first. Report counts and suggest actions.',
            },
            {
              name: 'Sentence Builder',
              capabilities: ['list templates', 'generate sentence', 'count variations', 'add template', 'add word table'],
              stateFields: ['totalTemplates', 'totalWords', 'estimatedVariations'],
              usageHint: 'When user asks about sentences or variations, calculate from template structure. Multiply option counts per slot for total variations.',
            },
            {
              name: 'Intent Enhancer',
              capabilities: ['predict intent', 'list keywords', 'list tags', 'add keyword', 'get stats'],
              stateFields: ['totalKeywords', 'totalTags', 'totalPredictions', 'averageConfidence', 'topIntents'],
              usageHint: 'When user asks about intent or meaning, check keywords and patterns. Use predictions to enhance understanding.',
            },
          ],
          interactionPatterns: [
            'Read builder state before answering builder-related questions.',
            'Report concrete numbers — word counts, variation estimates, confidence scores.',
            'Suggest next actions based on current state — e.g. "You have 12 words at basic level, want to add intermediate ones?"',
            'Cross-reference builders — use vocabulary words in sentence templates, use intent to select appropriate sentences.',
          ],
        },
      },
      {
        packId: 'amo.superbrain.conversation',
        packName: 'Conversation Patterns',
        packType: 'superbrain',
        version: '2',
        description: 'Response patterns for common interaction types — greetings, questions, ideas, debugging, creative tasks.',
        payload: {
          patterns: {
            greeting: { style: 'short', rule: 'Acknowledge and ask what they need.' },
            question: { style: 'adaptive', rule: 'Answer first, then context. Use CoT for complex questions.' },
            idea: { style: 'medium', rule: 'Reflect the idea, state feasibility, give next concrete step.' },
            debug: { style: 'full', rule: 'Ask for the error or file. Diagnose step by step.' },
            creative: { style: 'full', rule: 'Build atmosphere. Use specific images. Let meaning emerge.' },
            builder: { style: 'adaptive', rule: 'Read builder state, report numbers, suggest actions.' },
          },
          examples: [
            { input: 'how many variations?', response: 'Check builder state, multiply options per slot, report total.' },
            { input: 'help me improve this sentence', response: 'Use Intent Enhancer to understand goal, Sentence Builder to generate alternatives.' },
            { input: 'teach me some new words', response: 'Check Vocabulary Builder state, suggest words at the right difficulty level.' },
          ],
        },
      },
    ];

    await db.transaction(async () => {
      for (const pack of packs) {
        await db.exec({
          sql: `
            INSERT INTO seed_packs (
              pack_id, pack_name, pack_type, version, description,
              payload_json, enabled, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8)
            ON CONFLICT(pack_id) DO UPDATE SET
              pack_name = excluded.pack_name,
              pack_type = excluded.pack_type,
              version = excluded.version,
              description = excluded.description,
              payload_json = excluded.payload_json,
              updated_at = excluded.updated_at
          `,
          bind: [
            pack.packId,
            pack.packName,
            pack.packType,
            pack.version,
            pack.description,
            JSON.stringify(pack.payload),
            now,
            now,
          ],
        });
      }
    });
  }

  async upsertChunk(record: {
    id: string;
    documentId: string;
    documentName: string;
    content: string;
    embedding: number[];
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await this.init();
    const now = Date.now();
    const metadata = record.metadata || {};

    await this.db!.transaction(async () => {
      await this.db!.exec({
        sql: `
          INSERT INTO knowledge_documents (
            document_id, document_name, asset_kind, source,
            starter_pack_key, starter_pack_version, starter_pack_category,
            created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
          ON CONFLICT(document_id) DO UPDATE SET
            document_name = excluded.document_name,
            asset_kind = excluded.asset_kind,
            source = excluded.source,
            starter_pack_key = excluded.starter_pack_key,
            starter_pack_version = excluded.starter_pack_version,
            starter_pack_category = excluded.starter_pack_category,
            updated_at = excluded.updated_at
        `,
        bind: [
          record.documentId,
          record.documentName,
          String(metadata.assetKind || 'document'),
          String(metadata.source || 'user'),
          metadata.starterPackKey ? String(metadata.starterPackKey) : null,
          metadata.starterPackVersion ? String(metadata.starterPackVersion) : null,
          metadata.starterPackCategory ? String(metadata.starterPackCategory) : null,
          now,
          now,
        ],
      });

      await this.db!.exec({
        sql: `
          INSERT INTO knowledge_chunks (
            id, document_id, document_name, content, embedding_json, metadata_json,
            asset_kind, source, starter_pack_key, starter_pack_version, starter_pack_category,
            created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
          ON CONFLICT(id) DO UPDATE SET
            document_name = excluded.document_name,
            content = excluded.content,
            embedding_json = excluded.embedding_json,
            metadata_json = excluded.metadata_json,
            asset_kind = excluded.asset_kind,
            source = excluded.source,
            starter_pack_key = excluded.starter_pack_key,
            starter_pack_version = excluded.starter_pack_version,
            starter_pack_category = excluded.starter_pack_category,
            updated_at = excluded.updated_at
        `,
        bind: [
          record.id,
          record.documentId,
          record.documentName,
          record.content,
          JSON.stringify(record.embedding),
          JSON.stringify(metadata),
          String(metadata.assetKind || 'document'),
          String(metadata.source || 'user'),
          metadata.starterPackKey ? String(metadata.starterPackKey) : null,
          metadata.starterPackVersion ? String(metadata.starterPackVersion) : null,
          metadata.starterPackCategory ? String(metadata.starterPackCategory) : null,
          now,
          now,
        ],
      });
    });
  }

  async listChunks(): Promise<KnowledgeChunkRow[]> {
    await this.init();
    return this.db!.selectObjects<KnowledgeChunkRow>(`
      SELECT
        id,
        document_id,
        document_name,
        content,
        embedding_json,
        metadata_json,
        asset_kind,
        source,
        starter_pack_key,
        starter_pack_version,
        starter_pack_category,
        updated_at
      FROM knowledge_chunks
      ORDER BY updated_at DESC, id ASC
    `);
  }

  async listDocuments(): Promise<KnowledgeDocumentRow[]> {
    await this.init();
    return this.db!.selectObjects<KnowledgeDocumentRow>(`
      SELECT
        d.document_id,
        d.document_name,
        d.asset_kind,
        d.source,
        d.starter_pack_key,
        d.starter_pack_version,
        d.starter_pack_category,
        d.updated_at,
        COUNT(c.id) AS chunk_count
      FROM knowledge_documents d
      LEFT JOIN knowledge_chunks c ON c.document_id = d.document_id
      GROUP BY d.document_id, d.document_name, d.asset_kind, d.source, d.starter_pack_key, d.starter_pack_version, d.starter_pack_category, d.updated_at
      ORDER BY d.updated_at DESC, d.document_name ASC
    `);
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.init();
    await this.db!.exec({
      sql: `DELETE FROM knowledge_documents WHERE document_id = ?1`,
      bind: [documentId],
    });
  }

  async clearKnowledge(): Promise<void> {
    await this.init();
    await this.db!.exec('DELETE FROM knowledge_chunks;');
    await this.db!.exec('DELETE FROM knowledge_documents;');
  }

  async upsertConversationMemory(record: {
    id: string;
    scope: string;
    memoryType: string;
    title: string;
    content: string;
    tags?: string[];
    weight?: number;
  }): Promise<void> {
    await this.init();
    const now = Date.now();
    await this.db!.exec({
      sql: `
        INSERT INTO conversation_memory (
          id, scope, memory_type, title, content, tags_json, weight, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(id) DO UPDATE SET
          scope = excluded.scope,
          memory_type = excluded.memory_type,
          title = excluded.title,
          content = excluded.content,
          tags_json = excluded.tags_json,
          weight = excluded.weight,
          updated_at = excluded.updated_at
      `,
      bind: [
        record.id,
        record.scope,
        record.memoryType,
        record.title,
        record.content,
        JSON.stringify(record.tags || []),
        record.weight ?? 1,
        now,
        now,
      ],
    });
    console.log('[KnowledgeStore] upsertConversationMemory done for:', record.scope);
  }

  async listConversationMemory(scope: string): Promise<ConversationMemoryRow[]> {
    await this.init();
    const results = await this.db!.selectObjects<ConversationMemoryRow>(
      `
        SELECT id, scope, memory_type, title, content, tags_json, weight, created_at, updated_at
        FROM conversation_memory
        WHERE scope = ?1
        ORDER BY weight DESC, updated_at DESC
      `,
      [scope]
    );
    console.log('[KnowledgeStore] listConversationMemory for', scope, ':', results.length, 'rows');
    return results;
  }

  async updateConversationMemory(record: {
    id: string;
    title: string;
    content: string;
    tags?: string[];
    weight?: number;
  }): Promise<void> {
    await this.init();
    const existing = (await this.db!.selectObjects<ConversationMemoryRow>(
      `
        SELECT id, scope, memory_type, title, content, tags_json, weight, created_at, updated_at
        FROM conversation_memory
        WHERE id = ?1
      `,
      [record.id]
    ))[0];

    if (!existing) {
      throw new Error('Memory note not found');
    }

    await this.db!.exec({
      sql: `
        UPDATE conversation_memory
        SET title = ?2,
            content = ?3,
            tags_json = ?4,
            weight = ?5,
            updated_at = ?6
        WHERE id = ?1
      `,
      bind: [
        record.id,
        record.title,
        record.content,
        JSON.stringify(record.tags ?? parseJsonOrDefault(existing.tags_json || '[]', [])),
        record.weight ?? existing.weight,
        Date.now(),
      ],
    });
  }

  async deleteConversationMemory(id: string): Promise<void> {
    await this.init();
    await this.db!.exec({
      sql: `DELETE FROM conversation_memory WHERE id = ?1`,
      bind: [id],
    });
  }

  async clearConversationMemoryScope(scope: string): Promise<void> {
    await this.init();
    await this.db!.exec({
      sql: `DELETE FROM conversation_memory WHERE scope = ?1`,
      bind: [scope],
    });
  }

  async upsertMemorySummary(record: {
    id: string;
    scope: string;
    sourceType: string;
    sourceId: string;
    summary: string;
    keywords?: string[];
  }): Promise<void> {
    await this.init();
    const now = Date.now();
    await this.db!.exec({
      sql: `
        INSERT INTO memory_summaries (
          id, scope, source_type, source_id, summary, keywords_json, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(id) DO UPDATE SET
          scope = excluded.scope,
          source_type = excluded.source_type,
          source_id = excluded.source_id,
          summary = excluded.summary,
          keywords_json = excluded.keywords_json,
          updated_at = excluded.updated_at
      `,
      bind: [
        record.id,
        record.scope,
        record.sourceType,
        record.sourceId,
        record.summary,
        JSON.stringify(record.keywords || []),
        now,
        now,
      ],
    });
  }

  async listMemorySummaries(scope: string): Promise<MemorySummaryRow[]> {
    await this.init();
    return this.db!.selectObjects<MemorySummaryRow>(
      `
        SELECT id, scope, source_type, source_id, summary, keywords_json, created_at, updated_at
        FROM memory_summaries
        WHERE scope = ?1
        ORDER BY updated_at DESC
      `,
      [scope]
    );
  }

  async updateMemorySummary(record: {
    id: string;
    summary: string;
    keywords?: string[];
  }): Promise<void> {
    await this.init();
    const existing = (await this.db!.selectObjects<MemorySummaryRow>(
      `
        SELECT id, scope, source_type, source_id, summary, keywords_json, created_at, updated_at
        FROM memory_summaries
        WHERE id = ?1
      `,
      [record.id]
    ))[0];

    if (!existing) {
      throw new Error('Memory summary not found');
    }

    await this.db!.exec({
      sql: `
        UPDATE memory_summaries
        SET summary = ?2,
            keywords_json = ?3,
            updated_at = ?4
        WHERE id = ?1
      `,
      bind: [
        record.id,
        record.summary,
        JSON.stringify(record.keywords ?? parseJsonOrDefault(existing.keywords_json || '[]', [])),
        Date.now(),
      ],
    });
  }

  async deleteMemorySummary(id: string): Promise<void> {
    await this.init();
    await this.db!.exec({
      sql: `DELETE FROM memory_summaries WHERE id = ?1`,
      bind: [id],
    });
  }

  async clearMemorySummariesScope(scope: string): Promise<void> {
    await this.init();
    await this.db!.exec({
      sql: `DELETE FROM memory_summaries WHERE scope = ?1`,
      bind: [scope],
    });
  }

  async listToolRegistry(): Promise<ToolRegistryRow[]> {
    await this.init();
    return this.db!.selectObjects<ToolRegistryRow>(`
      SELECT
        tool_id, display_name, description, capability_group, enabled,
        input_schema_json, policy_json, created_at, updated_at
      FROM tool_registry
      ORDER BY capability_group ASC, display_name ASC
    `);
  }

  async listSeedPacks(): Promise<SeedPackRow[]> {
    await this.init();
    return this.db!.selectObjects<SeedPackRow>(`
      SELECT
        pack_id, pack_name, pack_type, version, description,
        payload_json, enabled, created_at, updated_at
      FROM seed_packs
      ORDER BY pack_type ASC, pack_name ASC
    `);
  }

  async forceCommit(): Promise<void> {
    // No-op: SQLite auto-commits in default mode
    // Keeping method for potential future use with explicit transactions
    console.log('[KnowledgeStore] forceCommit: auto-commit mode active');
  }

  // ===== BRAIN EXPORT/IMPORT FOR PERMANENT PRESERVATION =====

  async exportBrain(): Promise<{
    version: string;
    exportedAt: number;
    data: {
      knowledgeDocuments: KnowledgeDocumentRow[];
      knowledgeChunks: KnowledgeChunkRow[];
      conversationMemory: ConversationMemoryRow[];
      memorySummaries: MemorySummaryRow[];
      seedPacks: SeedPackRow[];
      toolRegistry: ToolRegistryRow[];
    };
  }> {
    await this.init();
    
    const [documents, chunks, memory, summaries, packs, tools] = await Promise.all([
      this.listDocuments(),
      this.listChunks(),
      this.listAllConversationMemory(),
      this.listAllMemorySummaries(),
      this.listSeedPacks(),
      this.listToolRegistry()
    ]);
    
    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      data: {
        knowledgeDocuments: documents,
        knowledgeChunks: chunks,
        conversationMemory: memory,
        memorySummaries: summaries,
        seedPacks: packs,
        toolRegistry: tools
      }
    };
  }

  async importBrain(
    backup: {
      version: string;
      exportedAt: number;
      data: {
        knowledgeDocuments: KnowledgeDocumentRow[];
        knowledgeChunks: KnowledgeChunkRow[];
        conversationMemory: ConversationMemoryRow[];
        memorySummaries: MemorySummaryRow[];
        seedPacks: SeedPackRow[];
        toolRegistry: ToolRegistryRow[];
      };
    },
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<void> {
    await this.init();
    
    // Validate backup format
    if (!backup.version || !backup.data) {
      throw new Error('Invalid backup format');
    }
    
    const { data } = backup;
    
    await this.db!.transaction(async () => {
      if (mode === 'replace') {
        // Clear existing data - use separate calls for Capacitor SQLite compatibility
        await this.db!.exec({ sql: 'DELETE FROM knowledge_chunks;', bind: [] });
        await this.db!.exec({ sql: 'DELETE FROM knowledge_documents;', bind: [] });
        await this.db!.exec({ sql: 'DELETE FROM conversation_memory;', bind: [] });
        await this.db!.exec({ sql: 'DELETE FROM memory_summaries;', bind: [] });
        await this.db!.exec({ sql: 'DELETE FROM seed_packs;', bind: [] });
        await this.db!.exec({ sql: 'DELETE FROM tool_registry;', bind: [] });
      }
      
      // Import knowledge documents
      for (const doc of data.knowledgeDocuments) {
        await this.db!.exec({
          sql: `
            INSERT OR ${mode === 'merge' ? 'IGNORE' : 'REPLACE'} INTO knowledge_documents (
              document_id, document_name, asset_kind, source,
              starter_pack_key, starter_pack_version, starter_pack_category,
              created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
          `,
          bind: [
            doc.document_id,
            doc.document_name,
            doc.asset_kind,
            doc.source,
            doc.starter_pack_key,
            doc.starter_pack_version,
            doc.starter_pack_category,
            doc.created_at || Date.now(),
            doc.updated_at || Date.now()
          ]
        });
      }
      
      // Import knowledge chunks
      for (const chunk of data.knowledgeChunks) {
        await this.db!.exec({
          sql: `
            INSERT OR ${mode === 'merge' ? 'IGNORE' : 'REPLACE'} INTO knowledge_chunks (
              id, document_id, document_name, content, embedding_json, metadata_json,
              asset_kind, source, starter_pack_key, starter_pack_version, starter_pack_category,
              created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
          `,
          bind: [
            chunk.id,
            chunk.document_id,
            chunk.document_name,
            chunk.content,
            chunk.embedding_json,
            chunk.metadata_json,
            chunk.asset_kind,
            chunk.source,
            chunk.starter_pack_key,
            chunk.starter_pack_version,
            chunk.starter_pack_category,
            chunk.created_at || Date.now(),
            chunk.updated_at || Date.now()
          ]
        });
      }
      
      // Import conversation memory
      for (const mem of data.conversationMemory) {
        await this.db!.exec({
          sql: `
            INSERT OR ${mode === 'merge' ? 'IGNORE' : 'REPLACE'} INTO conversation_memory (
              id, scope, memory_type, title, content, tags_json, weight, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
          `,
          bind: [
            mem.id,
            mem.scope,
            mem.memory_type,
            mem.title,
            mem.content,
            mem.tags_json,
            mem.weight,
            mem.created_at || Date.now(),
            mem.updated_at || Date.now()
          ]
        });
      }
      
      // Import memory summaries
      for (const summary of data.memorySummaries) {
        await this.db!.exec({
          sql: `
            INSERT OR ${mode === 'merge' ? 'IGNORE' : 'REPLACE'} INTO memory_summaries (
              id, scope, source_type, source_id, summary, keywords_json, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
          `,
          bind: [
            summary.id,
            summary.scope,
            summary.source_type,
            summary.source_id,
            summary.summary,
            summary.keywords_json,
            summary.created_at || Date.now(),
            summary.updated_at || Date.now()
          ]
        });
      }
      
      // Import seed packs
      for (const pack of data.seedPacks) {
        await this.db!.exec({
          sql: `
            INSERT OR ${mode === 'merge' ? 'IGNORE' : 'REPLACE'} INTO seed_packs (
              pack_id, pack_name, pack_type, version, description,
              payload_json, enabled, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
          `,
          bind: [
            pack.pack_id,
            pack.pack_name,
            pack.pack_type,
            pack.version,
            pack.description,
            pack.payload_json,
            pack.enabled,
            pack.created_at || Date.now(),
            pack.updated_at || Date.now()
          ]
        });
      }
      
      // Import tool registry
      for (const tool of data.toolRegistry) {
        await this.db!.exec({
          sql: `
            INSERT OR ${mode === 'merge' ? 'IGNORE' : 'REPLACE'} INTO tool_registry (
              tool_id, display_name, description, capability_group, enabled,
              input_schema_json, policy_json, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
          `,
          bind: [
            tool.tool_id,
            tool.display_name,
            tool.description,
            tool.capability_group,
            tool.enabled,
            tool.input_schema_json,
            tool.policy_json,
            tool.created_at || Date.now(),
            tool.updated_at || Date.now()
          ]
        });
      }
    });
    
    console.log(`[KnowledgeStore] Brain import completed in ${mode} mode`);
  }

  async listAllConversationMemory(): Promise<ConversationMemoryRow[]> {
    await this.init();
    return this.db!.selectObjects<ConversationMemoryRow>(`
      SELECT id, scope, memory_type, title, content, tags_json, weight, created_at, updated_at
      FROM conversation_memory
      ORDER BY weight DESC, updated_at DESC
    `);
  }

  async listAllMemorySummaries(): Promise<MemorySummaryRow[]> {
    await this.init();
    return this.db!.selectObjects<MemorySummaryRow>(`
      SELECT id, scope, source_type, source_id, summary, keywords_json, created_at, updated_at
      FROM memory_summaries
      ORDER BY updated_at DESC
    `);
  }

  async getBrainStats(): Promise<{
    documents: number;
    chunks: number;
    memoryNotes: number;
    summaries: number;
    seedPacks: number;
    tools: number;
    totalSize: number;
  }> {
    await this.init();
    
    const [docCount, chunkCount, memoryCount, summaryCount, packCount, toolCount] = await Promise.all([
      this.db!.selectObjects<{ count: number }>('SELECT COUNT(*) as count FROM knowledge_documents'),
      this.db!.selectObjects<{ count: number }>('SELECT COUNT(*) as count FROM knowledge_chunks'),
      this.db!.selectObjects<{ count: number }>('SELECT COUNT(*) as count FROM conversation_memory'),
      this.db!.selectObjects<{ count: number }>('SELECT COUNT(*) as count FROM memory_summaries'),
      this.db!.selectObjects<{ count: number }>('SELECT COUNT(*) as count FROM seed_packs'),
      this.db!.selectObjects<{ count: number }>('SELECT COUNT(*) as count FROM tool_registry')
    ]);
    
    return {
      documents: docCount[0]?.count || 0,
      chunks: chunkCount[0]?.count || 0,
      memoryNotes: memoryCount[0]?.count || 0,
      summaries: summaryCount[0]?.count || 0,
      seedPacks: packCount[0]?.count || 0,
      tools: toolCount[0]?.count || 0,
      totalSize: docCount[0]?.count || 0 + chunkCount[0]?.count || 0 + memoryCount[0]?.count || 0
    };
  }
}

export const knowledgeStoreService = new KnowledgeStoreService();
