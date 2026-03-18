import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

/**
 * Unified async interface for SQLite operations.
 * Works with both SQLite WASM (browser) and Capacitor native SQLite (Android).
 */
export interface AsyncSQLiteDb {
  exec(arg: string | { sql: string; bind?: unknown[] }): Promise<void>;
  selectObjects<T>(sql: string, bind?: unknown[]): Promise<T[]>;
  transaction<T>(callback: () => Promise<T>): Promise<T>;
}

/**
 * Wraps the synchronous SQLite WASM db for browser use.
 */
export class WasmSQLiteAdapter implements AsyncSQLiteDb {
  constructor(private db: {
    exec: (arg: string | { sql: string; bind?: unknown[]; rowMode?: string; returnValue?: string; resultRows?: unknown[] }) => unknown;
    selectObjects: <T>(sql: string, bind?: unknown[]) => T[];
    transaction: <T>(callback: () => T) => T;
  }) {}

  async exec(arg: string | { sql: string; bind?: unknown[] }): Promise<void> {
    this.db.exec(arg as any);
  }

  async selectObjects<T>(sql: string, bind?: unknown[]): Promise<T[]> {
    return this.db.selectObjects<T>(sql, bind);
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    // Use explicit BEGIN/COMMIT so the async callback works correctly.
    // Since WasmSQLiteAdapter's exec/selectObjects resolve immediately,
    // the awaits inside the callback settle in order.
    this.db.exec('BEGIN TRANSACTION');
    try {
      const result = await callback();
      this.db.exec('COMMIT');
      return result;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}

const DB_NAME = 'amo-knowledge';

/**
 * Wraps @capacitor-community/sqlite for persistent native Android storage.
 * Database stored in /data/data/<package>/databases/ — survives app restarts.
 */
export class CapacitorSQLiteAdapter implements AsyncSQLiteDb {
  private dbName: string;
  private conn: SQLiteConnection;
  private ready: boolean = false;

  constructor(dbName: string = DB_NAME) {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('CapacitorSQLiteAdapter can only be used on native platforms');
    }
    
    this.dbName = dbName;
    
    // Try to get the plugin - it might be loaded differently on Android
    let plugin = CapacitorSQLite;
    if (!plugin) {
      console.log('[CapSQLite] CapacitorSQLite not directly available, trying dynamic import');
      try {
        // Try importing the plugin dynamically
        const sqlitePlugin = require('@capacitor-community/sqlite');
        plugin = sqlitePlugin.CapacitorSQLite;
        console.log('[CapSQLite] Plugin loaded dynamically:', !!plugin);
      } catch (e) {
        console.error('[CapSQLite] Failed to load plugin dynamically:', e);
      }
    }
    
    if (!plugin) {
      console.error('[CapSQLite] CapacitorSQLite plugin not available');
      throw new Error('CapacitorSQLite plugin is not available. Did you run cap sync?');
    }
    
    try {
      this.conn = new SQLiteConnection(plugin);
      console.log('[CapSQLite] Adapter created for database:', dbName);
      console.log('[CapSQLite] SQLiteConnection created successfully');
    } catch (e) {
      console.error('[CapSQLite] Failed to create SQLiteConnection:', e);
      throw e;
    }
  }

  async open(): Promise<void> {
    if (this.ready) {
      console.log('[CapSQLite] Database already ready:', this.dbName);
      return;
    }
    
    console.log('[CapSQLite] Opening database:', this.dbName);
    
    try {
      await this.conn.checkConnectionsConsistency();
      console.log('[CapSQLite] Connection consistency checked');
      
      const isConn = await this.conn.isConnection(this.dbName, false);
      console.log('[CapSQLite] Is connection exists?', isConn.result);
      
      if (isConn.result) {
        console.log('[CapSQLite] Retrieving existing connection');
        const db = await this.conn.retrieveConnection(this.dbName, false);
        await db.open();
        console.log('[CapSQLite] Existing connection opened');
      } else {
        console.log('[CapSQLite] Creating new connection');
        const db = await this.conn.createConnection(this.dbName, false, 'no-encryption', 1, false);
        await db.open();
        console.log('[CapSQLite] New connection created and opened');
      }
      
      this.ready = true;
      console.log('[CapSQLite] Database opened successfully:', this.dbName);
    } catch (e) {
      console.error('[CapSQLite] Failed to open database:', e);
      throw e;
    }
  }

  private async getDb() {
    if (!this.ready) await this.open();
    return this.conn.retrieveConnection(this.dbName, false);
  }

  async exec(arg: string | { sql: string; bind?: unknown[] }): Promise<void> {
    const db = await this.getDb();
    if (typeof arg === 'string') {
      // transaction: false — we manage our own transactions; the default
      // (true) wraps PRAGMAs in BEGIN/COMMIT which silently fails.
      await db.execute(arg, false);
    } else if (arg.bind && arg.bind.length > 0) {
      // Convert ?1, ?2, ... positional params to ? params for capacitor-sqlite
      const sql = arg.sql.replace(/\?(\d+)/g, '?');
      // transaction: false — prevents nested transactions inside manual begin/commit
      await db.run(sql, arg.bind as any[], false);
    } else {
      await db.execute(arg.sql, false);
    }
  }

  async selectObjects<T>(sql: string, bind?: unknown[]): Promise<T[]> {
    const db = await this.getDb();
    const cleanSql = sql.replace(/\?(\d+)/g, '?');
    const result = await db.query(cleanSql, (bind as any[]) || []);
    return (result.values || []) as T[];
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    const db = await this.getDb();
    await db.beginTransaction();
    try {
      const result = await callback();
      await db.commitTransaction();
      return result;
    } catch (e) {
      await db.rollbackTransaction();
      throw e;
    }
  }
}

/**
 * Factory: returns the right adapter for the current platform.
 * Call this INSTEAD of directly creating SQLite WASM on native.
 */
export function isNativeSQLiteAvailable(): boolean {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  console.log('[SQLiteAdapter] Platform check - isNative:', isNative, 'platform:', platform);
  
  if (isNative) {
    // Force return true on Android - the plugin should be available after cap sync
    console.log('[SQLiteAdapter] Running on native platform, forcing SQLite availability');
    return true;
  }
  
  return false;
}
