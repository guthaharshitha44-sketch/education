declare module 'better-sqlite3' {
  interface RunResult {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }
  interface SqliteStatement {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): any;
    all(...params: unknown[]): any[];
    iterate(...params: unknown[]): IterableIterator<any>;
  }
  interface SqliteDatabase {
    exec(sql: string): void;
    prepare(sql: string): SqliteStatement;
    pragma(source: string, options?: { simple?: boolean }): unknown;
    close(): void;
  }
  export default class DatabaseConstructor {
    constructor(filename: string, options?: Record<string, unknown>);
    exec(sql: string): void;
    prepare(sql: string): SqliteStatement;
    pragma(source: string, options?: { simple?: boolean }): unknown;
    close(): void;
  }
}
