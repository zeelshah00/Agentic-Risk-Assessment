/**
 * Utility class to handle datetime conversion for metadata search filters
 * Converts various datetime formats to ISO 8601 format required by BigID API
 */
export class DateTimeHelper {
  /**
   * Convert a datetime value to ISO 8601 format
   * @param value - The datetime value (string, Date, or number)
   * @returns ISO 8601 formatted string or the original value if not a datetime
   */
  static toISO8601(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // If it's already a string that looks like ISO 8601, return as is
    if (typeof value === 'string' && this.isISO8601(value)) {
      return value;
    }

    // If it's a string that looks like a date, try to parse it
    if (typeof value === 'string') {
      const date = this.parseDateString(value);
      if (date) {
        return date.toISOString();
      }
      return value; // Return original if not a date
    }

    // If it's a Date object
    if (value instanceof Date) {
      return value.toISOString();
    }

    // If it's a number (timestamp)
    if (typeof value === 'number') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // Return original value if not a datetime
    return value;
  }

  /**
   * Check if a string is already in ISO 8601 format
   * @param str - The string to check
   * @returns True if the string is in ISO 8601 format
   */
  private static isISO8601(str: string): boolean {
    // Basic ISO 8601 regex pattern
    const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return iso8601Pattern.test(str);
  }

  /**
   * Parse various date string formats
   * @param dateStr - The date string to parse
   * @returns Date object or null if parsing fails
   */
  private static parseDateString(dateStr: string): Date | null {
    // Try common date formats
    const formats = [
      // ISO-like formats
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, // YYYY-MM-DDTHH:MM:SS
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, // YYYY-MM-DDTHH:MM:SSZ
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, // YYYY-MM-DDTHH:MM:SS.mmmZ
      
      // US formats
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{1,2}-\d{1,2}-\d{4}$/, // MM-DD-YYYY
      
      // Other common formats
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
    ];

    for (const format of formats) {
      if (format.test(dateStr)) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }

  /**
   * Process filter arrays to convert datetime values to ISO 8601
   * @param filters - Array of filter objects
   * @returns Processed filters with datetime values converted
   */
  static processFilters(filters: any[]): any[] {
    if (!Array.isArray(filters)) {
      return filters;
    }

    return filters.map(filter => {
      if (filter && typeof filter === 'object') {
        const processedFilter = { ...filter };
        
        // Convert value to ISO 8601 if fieldType is DATE
        if (processedFilter.fieldType === 'DATE' && processedFilter.value !== undefined) {
          processedFilter.value = this.toISO8601(processedFilter.value);
        }
        
        // Handle array values (for 'in' operator)
        if (Array.isArray(processedFilter.value)) {
          processedFilter.value = processedFilter.value.map((item: any) => {
            if (processedFilter.fieldType === 'DATE') {
              return this.toISO8601(item);
            }
            return item;
          });
        }
        
        return processedFilter;
      }
      return filter;
    });
  }

  /**
   * Process a complete metadata search request to convert datetime values
   * @param request - The metadata search request object
   * @returns Processed request with datetime values converted
   */
  static processMetadataSearchRequest(request: any): any {
    if (!request || typeof request !== 'object') {
      return request;
    }

    const processedRequest = { ...request };

    // Process filters if present
    if (processedRequest.filter && Array.isArray(processedRequest.filter)) {
      processedRequest.filter = this.processFilters(processedRequest.filter);
    }

    return processedRequest;
  }
} 