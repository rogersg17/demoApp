import { Request, Response } from 'express';
import { User } from './api';
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}
export interface AuthenticatedRequest extends Request {
    user: User;
}
export interface ApiRequest<T = any> extends Request {
    body: T;
    user?: User;
}
export interface ApiResponse<T = any> extends Response {
    json(body: {
        success: boolean;
        data?: T;
        error?: string;
        message?: string;
    }): this;
}
export type AsyncMiddleware = (req: Request, res: Response, next: (error?: any) => void) => Promise<void>;
export type AuthMiddleware = (req: Request, res: Response, next: (error?: any) => void) => void;
export type RouteHandler<ReqBody = any, ResBody = any> = (req: ApiRequest<ReqBody>, res: ApiResponse<ResBody>) => Promise<void> | void;
export type AuthenticatedRouteHandler<ReqBody = any, ResBody = any> = (req: AuthenticatedRequest & {
    body: ReqBody;
}, res: ApiResponse<ResBody>) => Promise<void> | void;
export type ErrorHandler = (error: Error, req: Request, res: Response, next: (error?: any) => void) => void;
export interface SessionData {
    userId?: number;
    username?: string;
    loginTime?: string;
    lastActivity?: string;
}
export interface ExecutionParams {
    executionId: string;
}
export interface RunnerParams {
    id: string;
}
export interface UserParams {
    userId: string;
}
//# sourceMappingURL=express.d.ts.map