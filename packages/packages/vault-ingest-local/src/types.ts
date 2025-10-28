/**
 * Configuration for local filesystem sync
 */
export interface LocalSyncConfig {
  /** Base path of workspace */
  basePath: string;
  
  /** Paths to watch relative to basePath */
  watchPaths: string[];
  
  /** Paths to exclude */
  excludePaths: string[];
  
  /** File types to sync */
  fileTypes: string[];
  
  /** Skip files that already exist from GitHub sync (by SHA hash) */
  dedupeVsGitHub: boolean;
  
  /** Number of files to process in each batch */
  batchSize: number;
}

/**
 * Result of local sync operation
 */
export interface LocalSyncResult {
  /** Total files discovered */
  filesFound: number;
  
  /** Files successfully processed */
  filesProcessed: number;
  
  /** Files skipped (duplicates) */
  filesSkipped: number;
  
  /** Files that failed */
  filesFailed: number;
  
  /** Duration in milliseconds */
  duration: number;
  
  /** Any errors encountered */
  errors: Array<{ file: string; error: string }>;
}
