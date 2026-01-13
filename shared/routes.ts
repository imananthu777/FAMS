import { z } from 'zod';
import { insertAssetSchema, insertUserSchema, assets, users, auditLogs, gatePasses } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: z.object({ message: z.string() }),
      }
    },
    users: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      }
    }
  },
  assets: {
    list: {
      method: 'GET' as const,
      path: '/api/assets',
      input: z.object({
        role: z.string().optional(),
        branchCode: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof assets.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/assets/:id',
      responses: {
        200: z.custom<typeof assets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/assets',
      input: insertAssetSchema,
      responses: {
        201: z.custom<typeof assets.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/assets/:id',
      input: insertAssetSchema.partial(),
      responses: {
        200: z.custom<typeof assets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/assets/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    search: {
        method: 'GET' as const,
        path: '/api/assets/search',
        input: z.object({ q: z.string() }),
        responses: {
            200: z.array(z.custom<typeof assets.$inferSelect>()),
        }
    }
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats',
      input: z.object({
        role: z.string().optional(),
        branchCode: z.string().optional(),
      }).optional(),
      responses: {
        200: z.object({
          totalAssets: z.number(),
          expiringSoon: z.number(),
          amcDue: z.number(),
          disposalPending: z.number(),
          newAssets: z.number(),
        }),
      },
    },
  },
  audit: {
    list: {
      method: 'GET' as const,
      path: '/api/audit-logs',
      responses: {
        200: z.array(z.custom<typeof auditLogs.$inferSelect>()),
      },
    },
  },
  gatepass: {
    create: {
      method: 'POST' as const,
      path: '/api/gatepass',
      input: z.object({
        assetId: z.string(),
        toBranch: z.string(),
        generatedBy: z.string(),
      }),
      responses: {
        201: z.custom<typeof gatePasses.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
