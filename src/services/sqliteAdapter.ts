import { Capacitor, Plugin } from '@capacitor/core';
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
    try {
      const sqlStr = typeof arg === 'string' ? arg : arg.sql;
      console.log('[WasmSQLite] Executing SQL:', sqlStr);
      await this.db.exec(arg as any);
      console.log('[WasmSQLite] SQL executed successfully');
    } catch (error) {
      console.error('[WasmSQLite] SQL execution failed:', error);
      const sqlStr = typeof arg === 'string' ? arg : arg.sql;
      throw new Error(`SQLite exec failed for "${sqlStr}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async selectObjects<T>(sql: string, bind?: unknown[]): Promise<T[]> {
    try {
      console.log('[WasmSQLite] Querying SQL:', sql, bind || []);
      const result = await this.db.selectObjects<T>(sql, bind);
      console.log('[WasmSQLite] Query successful, rows:', result.length);
      return result;
    } catch (error) {
      console.error('[WasmSQLite] Query failed:', error);
      throw new Error(`SQLite query failed for "${sql}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
 * Get the Capacitor SQLite plugin using multiple methods
 */
function getSQLitePlugin() {
  // Method 1: Direct import (most reliable)
  if (CapacitorSQLite) {
    console.log('[SQLiteAdapter] Found plugin via direct import');
    return CapacitorSQLite;
  }
  
  // Method 2: Capacitor's plugin registry
  const plugins = (Capacitor as any).Plugins;
  if (plugins && plugins.CapacitorSQLite) {
    console.log('[SQLiteAdapter] Found plugin in Capacitor.Plugins');
    return plugins.CapacitorSQLite;
  }
  
  // Method 3: Window object (fallback)
  if (typeof window !== 'undefined' && (window as any).CapacitorSQLite) {
    console.log('[SQLiteAdapter] Found plugin on window object');
    return (window as any).CapacitorSQLite;
  }
  
  // Method 4: Global object (fallback)
  if (typeof globalThis !== 'undefined' && (globalThis as any).CapacitorSQLite) {
    console.log('[SQLiteAdapter] Found plugin on globalThis');
    return (globalThis as any).CapacitorSQLite;
  }
  
  console.error('[SQLiteAdapter] SQLite plugin not found anywhere');
  return null;
}

/**
 * Wraps @capacitor-community/sqlite for persistent native Android storage.
 * Database stored in /data/data/<package>/databases/ — survives app restarts.
 */
export class CapacitorSQLiteAdapter implements AsyncSQLiteDb {
  private dbName: string;
  private conn?: SQLiteConnection;
  private ready: boolean = false;

  constructor(dbName: string = DB_NAME) {
    console.log('[CapSQLite] Constructor called for database:', dbName);
    console.log('[CapSQLite] Is native platform:', Capacitor.isNativePlatform());
    console.log('[CapSQLite] Platform:', Capacitor.getPlatform());
    
    if (!Capacitor.isNativePlatform()) {
      throw new Error('CapacitorSQLiteAdapter can only be used on native platforms');
    }
    
    this.dbName = dbName;
    console.log('[CapSQLite] Constructor completed - connection will be created in open()');
  }

  async open(): Promise<void> {
    if (this.ready) {
      console.log('[CapSQLite] Database already ready:', this.dbName);
      return;
    }
    
    console.log('[CapSQLite] Opening database:', this.dbName);
    
    // Wait a bit for Capacitor to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get the plugin using our robust getter
    const plugin = getSQLitePlugin();
    
    if (!plugin) {
      console.error('[CapSQLite] SQLite plugin not available');
      throw new Error('CapacitorSQLite plugin not available. Please ensure it is properly registered in MainActivity.');
    }
    
    try {
      console.log('[CapSQLite] Creating SQLiteConnection with plugin');
      this.conn = new SQLiteConnection(plugin);
      console.log('[CapSQLite] SQLiteConnection created');
      
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
    if (!this.conn) {
      throw new Error('Database connection not initialized');
    }
    const db = await this.conn.retrieveConnection(this.dbName, false);
    return db;
  }

  async exec(arg: string | { sql: string; bind?: unknown[] }): Promise<void> {
    try {
      const db = await this.getDb();
      const sqlStr = typeof arg === 'string' ? arg : arg.sql;
      console.log('[CapSQLite] Executing SQL:', sqlStr);
      
      if (typeof arg === 'string') {
        // transaction: false — we manage our own transactions; the default
        // (true) wraps PRAGMAs in BEGIN/COMMIT which silently fails.
        const isPragma = sqlStr.trim().toUpperCase().startsWith('PRAGMA');
        
        if (isPragma) {
          // PRAGMAs cannot use execute() or run() in capacitor-sqlite
          // They must be read-only queries, use query() instead
          console.log('[CapSQLite] PRAGMA detected, using query() method');
          try {
            await (db.query as any)(sqlStr, []);
            console.log('[CapSQLite] ✓ PRAGMA via query() succeeded');
          } catch (queryError) {
            console.warn('[CapSQLite] PRAGMA via query() also failed:', queryError);
            // If query fails, just log warning and continue
            // PRAGMAs are optional optimizations, not critical for functionality
            console.warn('[CapSQLite] Continuing without PRAGMA: ' + sqlStr);
          }
        } else {
          await db.execute(arg, false);
        }
      } else if (arg.bind && arg.bind.length > 0) {
        // Convert ?1, ?2, ... positional params to ? params for capacitor-sqlite
        const sql = arg.sql.replace(/\?(\d+)/g, '?');
        // transaction: false — prevents nested transactions inside manual begin/commit
        await db.run(sql, arg.bind as any[], false);
      } else {
        await db.execute(arg.sql, false);
      }
      
      console.log('[CapSQLite] ✓ SQL executed successfully');
    } catch (error) {
      console.error('[CapSQLite] ✗ SQL execution failed:', error);
      const sqlStr = typeof arg === 'string' ? arg : arg.sql;
      throw new Error(`Capacitor SQLite exec failed for "${sqlStr}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async selectObjects<T>(sql: string, bind?: unknown[]): Promise<T[]> {
    try {
      const db = await this.getDb();
      const cleanSql = sql.replace(/\?(\d+)/g, '?');
      console.log('[CapSQLite] Querying SQL:', cleanSql, bind || []);
      const result = await db.query(cleanSql, (bind as any[]) || []);
      console.log('[CapSQLite] ✓ Query successful, rows:', result.values?.length || 0);
      return (result.values || []) as T[];
    } catch (error) {
      console.error('[CapSQLite] ✗ Query failed:', error);
      const cleanSql = sql.replace(/\?(\d+)/g, '?');
      throw new Error(`Capacitor SQLite query failed for "${cleanSql}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
  console.log('[SQLiteAdapter] CapacitorSQLite exists:', typeof CapacitorSQLite !== 'undefined');
  
  if (isNative && platform === 'android') {
    // Always try to use SQLite on Android
    console.log('[SQLiteAdapter] Android detected - attempting to use native SQLite');
    return true;
  }
  
  return false;
}
