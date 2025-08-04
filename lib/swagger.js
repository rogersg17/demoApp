const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

/**
 * Configure Swagger/OpenAPI documentation
 */
function setupSwagger(app) {
  try {
    // Load OpenAPI specification from YAML file
    const swaggerDocument = YAML.load(path.join(__dirname, '../docs/openapi.yaml'));
    
    // Swagger UI options
    const options = {
      explorer: true,
      swaggerOptions: {
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
        requestInterceptor: (request) => {
          // Add credentials to requests for session-based auth
          request.credentials = 'include';
          return request;
        }
      },
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #3b82f6; }
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 4px; }
      `,
      customSiteTitle: "Test Management Platform API Documentation",
      customfavIcon: "/favicon.ico"
    };

    // Serve Swagger UI at /api-docs
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
    
    // Serve raw OpenAPI spec at /api-docs/spec
    app.get('/api-docs/spec', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocument);
    });

    // Serve OpenAPI spec in YAML format
    app.get('/api-docs/spec.yaml', (req, res) => {
      res.setHeader('Content-Type', 'text/yaml');
      res.sendFile(path.join(__dirname, '../docs/openapi.yaml'));
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

module.exports = { setupSwagger };
