// Database module type declarations
declare module '../database/database' {
  class Database {
    db: any; // SQLite3 database instance
    initialize(): Promise<void>;
    close?(): Promise<void>;
    run(query: string, params?: any[]): Promise<any>;
    get(query: string, params?: any[]): Promise<any>;
    all(query: string, params?: any[]): Promise<any[]>;
    initializeEnhancedOrchestrationTables?(): void;
  }
  
  export = Database;
}