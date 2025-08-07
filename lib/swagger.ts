import type { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import fs from 'fs';

/**
 * Configure Swagger/OpenAPI documentation.
 * Loads the OpenAPI spec from docs/openapi.yaml and mounts:
 *   - Interactive UI at /api-docs
 *   - Raw JSON spec at /api-docs/spec
 *   - Raw YAML spec at /api-docs/spec.yaml
 *
 * Returns true on success, false if setup fails (error already logged).
 */
export function setupSwagger(app: Express): boolean {
  try {
    // Attempt to locate the OpenAPI spec in common locations (handles compiled dist runtime)
    const candidatePaths = [
      path.join(__dirname, '../docs/openapi.yaml'), // when running from source
      path.join(__dirname, '../../docs/openapi.yaml'), // if this file ends up in dist/lib
      path.join(process.cwd(), 'docs/openapi.yaml') // project root fallback
    ];

    const specPath = candidatePaths.find(p => fs.existsSync(p));
    if (!specPath) {
      console.warn('⚠️ OpenAPI spec not found at expected locations. Skipping Swagger setup.');
      return false;
    }

    // Load specification (YAML -> JS object)
    const swaggerDocument: unknown = YAML.load(specPath);

    // Swagger UI configuration
    const options = {
      explorer: true,
      swaggerOptions: {
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
        requestInterceptor: (request: any) => {
          // Add credentials to requests for session-based auth
          /* eslint-disable no-param-reassign */
          request.credentials = 'include';
          return request;
        }
      },
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #3b82f6; }
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 4px; }
      `,
      customSiteTitle: 'Test Management Platform API Documentation',
      customfavIcon: '/favicon.ico'
    };

    // Mount interactive UI
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument as any, options));

    // Raw JSON spec
    app.get('/api-docs/spec', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocument);
    });

    // Raw YAML spec
    app.get('/api-docs/spec.yaml', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/yaml');
      res.sendFile(specPath);
    });

    console.log('✅ Swagger UI configured successfully');
    console.log('📖 API Documentation available at: http://localhost:3000/api-docs');
    console.log('📋 OpenAPI Spec available at: http://localhost:3000/api-docs/spec');
    return true;
  } catch (error) {
    console.error('❌ Failed to setup Swagger UI:', error);
    return false;
  }
}

export default { setupSwagger };
