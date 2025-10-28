import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { loadConfig } from '@tekupvault/vault-core';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const router: RouterType = Router();

/**
 * GET /api/debug
 * Debug endpoint to check configuration and database connectivity
 */
router.get('/debug', async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  try {
    // Test configuration loading
    let config;
    try {
      config = loadConfig();
    } catch (configError) {
      res.status(500).json({
        success: false,
        error: 'Configuration error',
        details: configError instanceof Error ? configError.message : 'Unknown config error'
      });
      return;
    }

    // Test database connectivity
    let dbTest;
    try {
      const { error } = await supabase
        .from('vault_sync_status')
        .select('count(*)')
        .limit(1);
      
      if (error) {
        dbTest = { success: false, error: error.message };
      } else {
        dbTest = { success: true, message: 'Database connection OK' };
      }
    } catch (dbError) {
      dbTest = { 
        success: false, 
        error: dbError instanceof Error ? dbError.message : 'Unknown DB error' 
      };
    }

    // Test table existence
    let tableTest;
    try {
      const { data, error } = await supabase
        .from('vault_documents')
        .select('id')
        .limit(1);
      
      if (error) {
        tableTest = { success: false, error: error.message };
      } else {
        tableTest = { success: true, documentCount: data?.length || 0 };
      }
    } catch (tableError) {
      tableTest = { 
        success: false, 
        error: tableError instanceof Error ? tableError.message : 'Unknown table error' 
      };
    }

    res.json({
      success: true,
      config: {
        hasSupabaseUrl: !!config.SUPABASE_URL,
        supabaseUrlFormat: config.SUPABASE_URL?.startsWith('https://') ? 'valid' : 'invalid',
        supabaseUrlLength: config.SUPABASE_URL?.length || 0,
        hasSupabaseKey: !!config.SUPABASE_SERVICE_KEY,
        supabaseKeyLength: config.SUPABASE_SERVICE_KEY?.length || 0,
        hasOpenAIKey: !!config.OPENAI_API_KEY,
        nodeEnv: config.NODE_ENV,
        logLevel: config.LOG_LEVEL
      },
      database: dbTest,
      tables: tableTest
    });

  } catch (error) {
    logger.error({ error }, 'Debug endpoint failed');
    res.status(500).json({
      success: false,
      error: 'Debug endpoint error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
