// Minimal module declarations for libraries lacking bundled TypeScript types.
// Extend as needed for stricter typing.

declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';
  interface SwaggerUiOptions {
    explorer?: boolean;
    swaggerOptions?: Record<string, any>;
    customCss?: string;
    customSiteTitle?: string;
    customfavIcon?: string;
  }
  const serve: RequestHandler[] | RequestHandler;
  function setup(swaggerDoc: any, options?: SwaggerUiOptions): RequestHandler;
  export { serve, setup };
  const _default: { serve: typeof serve; setup: typeof setup };
  export default _default;
}

declare module 'yamljs' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function load(path: string): any;
  const _default: { load: typeof load };
  export default _default;
}
