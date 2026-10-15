export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'MavunoIQ Backend API',
    version: '1.0.0',
    description:
      'AI-powered agricultural marketplace connecting Kenyan farmers with verified buyers. ' +
      'Some endpoints return clearly labelled DEMO data when external providers are not configured.',
  },
  servers: [
    { url: 'http://localhost:5000/api/v1', description: 'Development' },
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
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          code: { type: 'string' },
          errors: { type: 'array', items: { type: 'object' } },
          requestId: { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new farmer or buyer',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'firstName', 'lastName', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  phone: { type: 'string' },
                  role: { type: 'string', enum: ['FARMER', 'BUYER'] },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Registered' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Logged in' }, '401': { description: 'Invalid credentials' } },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products (public)',
        security: [],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'county', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        tags: ['Products'],
        summary: 'Create a product (farmer)',
        responses: { '201': { description: 'Created' } },
      },
    },
    '/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create order (buyer)',
        parameters: [
          { name: 'idempotency-key', in: 'header', schema: { type: 'string' } },
        ],
        responses: { '201': { description: 'Created' } },
      },
    },
    '/payments/mpesa/stk-push': {
      post: {
        tags: ['Payments'],
        summary: 'Initiate M-Pesa STK push (or demo)',
        responses: { '200': { description: 'Initiated' } },
      },
    },
    '/payments/mpesa/callback': {
      post: {
        tags: ['Payments'],
        summary: 'M-Pesa callback',
        security: [],
        responses: { '200': { description: 'Received' } },
      },
    },
    '/ai-advisor/chat': {
      post: {
        tags: ['AI Advisor'],
        summary: 'Chat with AI advisor',
        responses: { '201': { description: 'Response' } },
      },
    },
    '/market-intelligence/price-recommendation': {
      post: {
        tags: ['Market Intelligence'],
        summary: 'Get a price recommendation',
        responses: { '200': { description: 'Recommendation' } },
      },
    },
    '/weather/advice': {
      post: {
        tags: ['Weather'],
        summary: 'Get weather-based advice',
        responses: { '200': { description: 'Advice' } },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: { '200': { description: 'OK' } },
      },
    },
  },
};