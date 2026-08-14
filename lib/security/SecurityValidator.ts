
export class SecurityValidator {
  private forbiddenPatterns = [
    // PII: Social Security Number (US) - Basic check
    /\b(?!000|666|9\d{2})([0-8]\d{2}|7([0-6]\d))([-]?)(?!00)\d{2}\3(?!0000)\d{4}\b/,
    // PII: Credit Card Numbers (Basic Luhn check candidates / format check)
    /\b(?:\d[ -]*?){13,16}\b/,
    // Injection: Basic SQL Injection heuristics
    /\b(DROP|DELETE|INSERT|UPDATE|ALTER)\b\s+\b(TABLE|DATABASE|USER|VIEW)\b/i,
    /\b(SELECT)\b\s+.*\s+\b(FROM)\b/i,
    // Injection: Script/XSS attempts
    /<script\b[^>]*>([\s\S]*?)<\/script>/igm,
    /javascript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    // System: Potential command injection
    /(\||&|;)\s*(ls|cat|rm|echo|sudo)\s+/
  ];

  private sensitiveKeys = [
    'password', 
    'token', 
    'secret', 
    'key', 
    'auth', 
    'credential', 
    'private', 
    'ssn', 
    'creditcard', 
    'cc_number',
    'api_key'
  ];

  /**
   * Validates an input string against forbidden patterns and length constraints.
   * @param query The input string to validate.
   * @returns An object indicating validity and a list of issues found.
   */
  validateInput(query: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!query) return { valid: true, issues: [] };

    // Length check (prevent basic buffer overflow/DoS via massive inputs)
    if (query.length > 10000) {
      issues.push("Input exceeds maximum length of 10000 characters.");
    }

    // Pattern check
    this.forbiddenPatterns.forEach(pattern => {
      if (pattern.test(query)) {
        // Classify the issue without revealing the sensitive data in the error message
        const source = pattern.source;
        if (source.includes('script') || source.includes('javascript') || source.includes('onload')) {
          issues.push("Potential Cross-Site Scripting (XSS) or Malicious Script vector detected.");
        } else if (source.includes('DROP') || source.includes('SELECT')) {
          issues.push("Potential SQL Injection pattern detected.");
        } else if (source.includes('ls|cat')) {
           issues.push("Potential Command Injection pattern detected.");
        } else {
          issues.push("Potential Personally Identifiable Information (PII) or sensitive data pattern detected.");
        }
      }
    });

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Creates a sanitized deep copy of a context object, redacting sensitive keys.
   * @param context The context object to sanitize.
   * @returns A sanitized copy of the object.
   */
  sanitizeContext(context: any): any {
    if (typeof context !== 'object' || context === null) {
      return context;
    }

    // Handle Date objects (return new copy)
    if (context instanceof Date) {
      return new Date(context);
    }

    // Handle Arrays
    if (Array.isArray(context)) {
      return context.map(item => this.sanitizeContext(item));
    }

    // Handle Objects
    const sanitized: any = {};
    for (const key in context) {
      if (Object.prototype.hasOwnProperty.call(context, key)) {
        const lowerKey = key.toLowerCase();
        
        // Check if key matches sensitive list
        if (this.sensitiveKeys.some(sk => lowerKey.includes(sk))) {
          sanitized[key] = '[REDACTED]';
        } else {
          // Recursively sanitize values
          sanitized[key] = this.sanitizeContext(context[key]);
        }
      }
    }
    return sanitized;
  }

  /**
   * Simple HTML escaping to prevent rendering injected HTML.
   * @param unsafe The string to escape.
   */
  escapeHTML(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
