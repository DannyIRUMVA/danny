import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Management API',
      version: '1.0.0',
      description: 'Task management API documentation',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', nullable: true },
            email: { type: 'string' }
          }
        },
        UserRegister: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: { token: { type: 'string' } }
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            assigned_to: { type: 'integer', nullable: true },
            assigned_to_email: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['Pending','In Progress','Completed'] },
            due_date: { type: 'string', format: 'date', nullable: true },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        TaskCreate: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            assigned_to: { type: 'integer' },
            status: { type: 'string' },
            due_date: { type: 'string', format: 'date' }
          }
        },
        TaskUpdate: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            assigned_to: { type: 'integer' },
            status: { type: 'string' },
            due_date: { type: 'string', format: 'date' }
          }
        },
        AssignRequest: {
          type: 'object',
          required: ['user_id'],
          properties: { user_id: { type: 'integer' } }
        }
      }
    },
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);

// Export the generated OpenAPI spec for programmatic access/tests
export { specs };

// Ensure commonly-used paths are present in the generated spec (augment if swagger-jsdoc
// didn't pick up certain inline JSDoc blocks). This keeps the OpenAPI JSON complete.
specs.paths = specs.paths || {};

// GET /tasks/users/all
if (!specs.paths['/tasks/users/all']) {
  specs.paths['/tasks/users/all'] = {
    get: {
      summary: 'Get all users (id and email)',
      tags: ['Tasks'],
      responses: {
        '200': {
          description: 'Array of users',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/User' }
              }
            }
          }
        }
      }
    }
  };
}

// POST /tasks/{id}/assign
if (!specs.paths['/tasks/{id}/assign']) {
  specs.paths['/tasks/{id}/assign'] = {
    post: {
      summary: 'Assign a task to a user',
      tags: ['Tasks'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AssignRequest' } }
        }
      },
      responses: {
        '200': {
          description: 'Assigned task',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } }
        }
      }
    }
  };
}

// Health endpoint
if (!specs.paths['/health']) {
  specs.paths['/health'] = {
    get: {
      summary: 'Health check',
      responses: {
        '200': {
          description: 'Server health',
          content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' } } } } }
        }
      }
    }
  };
}

export const swaggerDocs = (app) => {
  console.log('Swagger UI mounted; available endpoints count:', Object.keys(specs.paths || {}).length);
  // Serve interactive Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

  // Expose raw OpenAPI JSON at /api
  app.get('/api', (req, res) => {
    res.json(specs);
  });
};

// Persist generated OpenAPI JSON to repo root so `openapi.json` stays in sync
try {
  const out = path.resolve(process.cwd(), 'openapi.json');
  fs.writeFileSync(out, JSON.stringify(specs, null, 2), 'utf8');
  console.log('Wrote OpenAPI JSON to', out);
} catch (e) {
  console.warn('Failed to write openapi.json', e);
}
