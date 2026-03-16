import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { Capacitor } from '@capacitor/core';

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
  private db: SQLiteDb | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    if (!this.initPromise) {
      this.initPromise = this.initializeInternal();
    }

    await this.initPromise;
  }

  private async initializeInternal(): Promise<void> {
    const sqlite = await sqlite3InitModule() as unknown as SQLiteModule;
    this.sqlite = sqlite;

    if (Capacitor.isNativePlatform()) {
      // On native Android, use file-based SQLite - persists across cache clears
      // Using relative path with 'c' (create) and 't' (truncate=open existing or create new)
      console.log('[KnowledgeStore] Initializing SQLite on native platform...');
      this.db = new sqlite.oo1.DB('amo-knowledge.sqlite3', 'ct');
      console.log('[KnowledgeStore] SQLite DB opened: amo-knowledge.sqlite3');
    } else if (sqlite.oo1.JsStorageDb && isBrowser()) {
      // On web browser, use localStorage-backed SQLite
      console.log('[KnowledgeStore] Using localStorage-backed SQLite (browser)');
      this.db = new sqlite.oo1.JsStorageDb('amo-knowledge-store');
    } else {
      // Fallback to file-based
      console.log('[KnowledgeStore] Using fallback file-based SQLite');
      this.db = new sqlite.oo1.DB('/amo-knowledge.sqlite3', 'ct');
    }

    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA temp_store = MEMORY;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

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

      CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id
      ON knowledge_chunks(document_id);

      CREATE INDEX IF NOT EXISTS idx_knowledge_documents_updated_at
      ON knowledge_documents(updated_at DESC);

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

      CREATE INDEX IF NOT EXISTS idx_conversation_memory_scope
      ON conversation_memory(scope, updated_at DESC);

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

      CREATE INDEX IF NOT EXISTS idx_memory_summaries_scope
      ON memory_summaries(scope, updated_at DESC);

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

    this.db.exec({
      sql: `
        INSERT INTO app_meta(key, value)
        VALUES('schema_version', ?1)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `,
      bind: [String(SCHEMA_VERSION)],
    });

    await this.migrateLegacyVectors();
    this.seedDefaultToolRegistry();
    this.seedDefaultKnowledgePacks();
  }

  private async migrateLegacyVectors(): Promise<void> {
    if (!isBrowser() || !this.db) {
      return;
    }

    const alreadyMigrated = this.db.selectObjects<{ value: string }>(
      `SELECT value FROM app_meta WHERE key = 'legacy_vector_db_migrated'`
    )[0]?.value;

    if (alreadyMigrated === 'true') {
      return;
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_VECTOR_STORAGE_KEY);
    if (!legacyRaw) {
      this.markLegacyMigrationComplete();
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
      this.markLegacyMigrationComplete();
      return;
    }

    const now = Date.now();
    this.db.transaction(() => {
      for (const doc of legacyDocs) {
        const metadata = doc.metadata || {};
        this.db!.exec({
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

        this.db!.exec({
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
    this.markLegacyMigrationComplete();
  }

  private markLegacyMigrationComplete(): void {
    this.db?.exec({
      sql: `
        INSERT INTO app_meta(key, value)
        VALUES('legacy_vector_db_migrated', 'true')
        ON CONFLICT(key) DO UPDATE SET value = 'true'
      `,
    });
  }

  private seedDefaultToolRegistry(): void {
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

    this.db!.transaction(() => {
      for (const tool of defaultTools) {
        this.db!.exec({
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

  private seedDefaultKnowledgePacks(): void {
    const now = Date.now();
    const packs = [
      {
        packId: 'amo.generic.conversation',
        packName: 'Generic Conversation Patterns',
        packType: 'conversation-patterns',
        version: '1',
        description: 'Short-form conversational response patterns for fast replies.',
        payload: {
          intents: ['greeting', 'idea', 'suggestion', 'question', 'clarification'],
          style: 'short-direct-grounded',
          rules: ['prefer practical answers', 'avoid long chain-of-thought style responses', 'escalate to retrieval when needed'],
        },
      },
      {
        packId: 'amo.idea.response',
        packName: 'Ideas And Suggestions',
        packType: 'response-examples',
        version: '1',
        description: 'Guidance for replying to user ideas and suggestions clearly.',
        payload: {
          pattern: ['reflect the idea', 'state feasibility', 'give next concrete step'],
          examples: [
            'That can work. The fastest path is to start with the data layer first.',
            'Good direction. The tradeoff is complexity, so we should keep the first version narrow.',
          ],
        },
      },
    ];

    this.db!.transaction(() => {
      for (const pack of packs) {
        this.db!.exec({
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

    this.db!.transaction(() => {
      this.db!.exec({
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

      this.db!.exec({
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
    this.db!.exec({
      sql: `DELETE FROM knowledge_documents WHERE document_id = ?1`,
      bind: [documentId],
    });
  }

  async clearKnowledge(): Promise<void> {
    await this.init();
    this.db!.exec('DELETE FROM knowledge_chunks; DELETE FROM knowledge_documents;');
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
    this.db!.exec({
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
    const results = this.db!.selectObjects<ConversationMemoryRow>(
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
    const existing = this.db!.selectObjects<ConversationMemoryRow>(
      `
        SELECT id, scope, memory_type, title, content, tags_json, weight, created_at, updated_at
        FROM conversation_memory
        WHERE id = ?1
      `,
      [record.id]
    )[0];

    if (!existing) {
      throw new Error('Memory note not found');
    }

    this.db!.exec({
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
    this.db!.exec({
      sql: `DELETE FROM conversation_memory WHERE id = ?1`,
      bind: [id],
    });
  }

  async clearConversationMemoryScope(scope: string): Promise<void> {
    await this.init();
    this.db!.exec({
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
    this.db!.exec({
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
    const existing = this.db!.selectObjects<MemorySummaryRow>(
      `
        SELECT id, scope, source_type, source_id, summary, keywords_json, created_at, updated_at
        FROM memory_summaries
        WHERE id = ?1
      `,
      [record.id]
    )[0];

    if (!existing) {
      throw new Error('Memory summary not found');
    }

    this.db!.exec({
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
    this.db!.exec({
      sql: `DELETE FROM memory_summaries WHERE id = ?1`,
      bind: [id],
    });
  }

  async clearMemorySummariesScope(scope: string): Promise<void> {
    await this.init();
    this.db!.exec({
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
}

export const knowledgeStoreService = new KnowledgeStoreService();
