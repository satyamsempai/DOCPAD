import fs from 'fs';
import path from 'path';

interface AuditLogEntry {
  timestamp: string;
  userId?: string;
  email?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

const AUDIT_LOG_DIR = path.join(__dirname, '../logs');
const AUDIT_LOG_FILE = path.join(AUDIT_LOG_DIR, 'audit.log');

// Ensure log directory exists
if (!fs.existsSync(AUDIT_LOG_DIR)) {
  fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
}

/**
 * Log audit event
 */
export function logAuditEvent(entry: AuditLogEntry): void {
  try {
    const logLine = JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    }) + '\n';
    
    fs.appendFileSync(AUDIT_LOG_FILE, logLine, 'utf8');
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Log authentication event
 */
export function logAuthEvent(
  action: 'login' | 'logout' | 'token_refresh' | 'login_failed',
  userId?: string,
  email?: string,
  success: boolean = true,
  error?: string,
  ipAddress?: string,
  userAgent?: string
): void {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    userId,
    email,
    action,
    success,
    error,
    ipAddress,
    userAgent,
  });
}

/**
 * Log data access event
 */
export function logDataAccess(
  action: 'view' | 'create' | 'update' | 'delete' | 'export',
  resource: string,
  resourceId: string,
  userId: string,
  email: string,
  success: boolean = true,
  error?: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, any>
): void {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    userId,
    email,
    action,
    resource,
    resourceId,
    success,
    error,
    ipAddress,
    userAgent,
    metadata,
  });
}

/**
 * Log security event
 */
export function logSecurityEvent(
  event: 'unauthorized_access' | 'suspicious_activity' | 'data_breach_attempt' | 'password_change',
  userId?: string,
  email?: string,
  details?: string,
  ipAddress?: string,
  userAgent?: string
): void {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    userId,
    email,
    action: event,
    success: false,
    error: details,
    ipAddress,
    userAgent,
  });
}

/**
 * Read audit logs (for admin review)
 */
export function readAuditLogs(
  limit: number = 100,
  startDate?: Date,
  endDate?: Date,
  userId?: string
): AuditLogEntry[] {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      return [];
    }

    const logContent = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
    const lines = logContent.trim().split('\n').filter(Boolean);
    
    let entries: AuditLogEntry[] = lines
      .map(line => {
        try {
          return JSON.parse(line) as AuditLogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is AuditLogEntry => entry !== null);

    // Filter by date range
    if (startDate) {
      entries = entries.filter(entry => new Date(entry.timestamp) >= startDate);
    }
    if (endDate) {
      entries = entries.filter(entry => new Date(entry.timestamp) <= endDate);
    }

    // Filter by user
    if (userId) {
      entries = entries.filter(entry => entry.userId === userId);
    }

    // Sort by timestamp (newest first) and limit
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return entries.slice(0, limit);
  } catch (error) {
    console.error('Failed to read audit logs:', error);
    return [];
  }
}

