import { ServerConfig, TypedServer, ExecutionUpdate } from './types';
declare const app: import("express-serve-static-core").Express;
declare const server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare const io: TypedServer;
declare const db: any;
declare const serverConfig: ServerConfig;
declare function emitTestUpdate(testId: string, update: Partial<ExecutionUpdate>): void;
declare let mvpServices: Record<string, any>;
declare let orchestrationServices: Record<string, any>;
export { app, server, io, db, emitTestUpdate, mvpServices, orchestrationServices, serverConfig };
//# sourceMappingURL=server.d.ts.map