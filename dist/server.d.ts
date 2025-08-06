import { ServerConfig, TypedServer, ExecutionUpdate } from './types';
import Database from './database/database';
import { prismaDb } from './database/prisma-database';
declare const app: import("express-serve-static-core").Express;
declare const server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare const io: TypedServer;
declare const db: Database;
declare const serverConfig: ServerConfig;
declare function emitTestUpdate(testId: string, update: Partial<ExecutionUpdate>): void;
declare let mvpServices: Record<string, any>;
declare let orchestrationServices: Record<string, any>;
export { app, server, io, db, prismaDb, emitTestUpdate, mvpServices, orchestrationServices, serverConfig };
//# sourceMappingURL=server.d.ts.map