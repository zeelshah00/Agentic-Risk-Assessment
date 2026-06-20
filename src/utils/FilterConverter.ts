import { StructuredFilter, NumberFilter, DateFilter, RelativeDate, TagFilter } from '../types/filterTypes';
import { 
  structuredFilterConfig, 
  getFieldMapping, 
  getOperatorMapping, 
  isTagBasedField, 
  getTagName, 
  getTagQueryTemplate,
  requiresCatalogTag,
  getTagHierarchy,
  getSystemSensitivityValues,
  isValidSensitivityValue,
  getSupportedEntityTypes,
  isValidEntityType,
  isWorkingParameter,
  isBrokenParameter,
  isPartiallyWorkingParameter,
  isNoDataParameter,
  getParameterWorkingStatus,
  getParameterNotes
} from '../config/structuredFilterConfig';

export class FilterConverter {
  /**
   * Convert StructuredFilter to BigID query string
   * Updated to handle real-world BigID API behavior based on test results
   */
  static convertToBigIDQuery(filter: StructuredFilter): string {
    const conditions: string[] = [];

    for (const [fieldName, value] of Object.entries(filter)) {
      if (value === null || value === undefined) continue;
      
      const condition = this.processField(fieldName, value);
      if (condition) {
        conditions.push(condition);
      }
    }

    // Join all conditions with AND
    return conditions.length > 0 ? conditions.join(' AND ') : '';
  }

  private static processField(fieldName: string, value: any): string | null {
    // Handle customQuery as pass-through with parentheses requirement
    if (fieldName === 'customQuery') {
      if (typeof value === 'string') {
        // If it looks like a BigID query, pass it through
        if (value.includes('=') || value.includes('IN') || value.includes('catalog_tag') || value.includes('>') || value.includes('<')) {
          // Ensure parentheses for complex expressions
          if (!value.startsWith('(') && (value.includes('>') || value.includes('<') || value.includes('IN'))) {
            return `(${value})`;
          }
          return value;
        }
        // Otherwise, treat as simple search term
        return `objectName = "${value}"`;
      }
      return null;
    }

    // Check if parameter is broken and warn
    if (isBrokenParameter(fieldName)) {
      console.warn(`Warning: Parameter '${fieldName}' is known to not work in BigID API. ${getParameterNotes(fieldName)}`);
      return null;
    }

    // Check if parameter has no data and warn
    if (isNoDataParameter(fieldName)) {
      console.warn(`Warning: Parameter '${fieldName}' exists but has no data available. ${getParameterNotes(fieldName)}`);
      return null;
    }

    // Check if parameter is partially working and warn
    if (isPartiallyWorkingParameter(fieldName)) {
      console.warn(`Warning: Parameter '${fieldName}' is partially working. ${getParameterNotes(fieldName)}`);
    }

    // Validate entity types against system
    if (fieldName === 'entityType') {
      if (Array.isArray(value)) {
        for (const val of value) {
          if (typeof val === 'string' && !isValidEntityType(val)) {
            console.warn(`Warning: Unsupported entity type: ${val}. Supported types: ${getSupportedEntityTypes().join(', ')}`);
          }
        }
      } else if (typeof value === 'string' && !isValidEntityType(value)) {
        console.warn(`Warning: Unsupported entity type: ${value}. Supported types: ${getSupportedEntityTypes().join(', ')}`);
      }
    }

    // Validate sensitivity values
    if (fieldName === 'sensitivity') {
      if (Array.isArray(value)) {
        const invalidValues = value.filter(val => !isValidSensitivityValue(val));
        if (invalidValues.length > 0) {
          console.warn(`Warning: Invalid sensitivity values: ${invalidValues.join(', ')}. Valid values: ${getSystemSensitivityValues().join(', ')}`);
        }
      } else if (typeof value === 'string' && !isValidSensitivityValue(value)) {
        console.warn(`Warning: Invalid sensitivity value: ${value}. Valid values: ${getSystemSensitivityValues().join(', ')}`);
      }
    }

    // Get field mapping
    const mapping = getFieldMapping(fieldName);
    if (!mapping) {
      return null;
    }

    // Handle tag filters with tagHierarchy format (REQUIRED FORMAT)
    if (fieldName === 'tags') {
      // Handle single TagFilter object
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && 
          'tagHierarchy' in value && typeof value.tagHierarchy === 'string') {
        const tagFilter = value as TagFilter;
        if (tagFilter.tagHierarchy && tagFilter.value) {
          if (Array.isArray(tagFilter.value)) {
            const quotedValues = tagFilter.value.map((v: string) => `"${v}"`).join(',');
            return `catalog_tag.${tagFilter.tagHierarchy} in (${quotedValues})`;
          } else {
            return `catalog_tag.${tagFilter.tagHierarchy} in ("${tagFilter.value}")`;
          }
        }
      }
      
      // Handle array of TagFilter objects
      if (Array.isArray(value) && value.length > 0 && 
          typeof value[0] === 'object' && value[0] !== null && 
          'tagHierarchy' in value[0] && typeof value[0].tagHierarchy === 'string') {
        const tagConditions: string[] = [];
        
        for (const tagFilter of value) {
          if (tagFilter.tagHierarchy && tagFilter.value) {
            if (Array.isArray(tagFilter.value)) {
              const quotedValues = tagFilter.value.map((v: string) => `"${v}"`).join(',');
              tagConditions.push(`catalog_tag.${tagFilter.tagHierarchy} in (${quotedValues})`);
            } else {
              tagConditions.push(`catalog_tag.${tagFilter.tagHierarchy} in ("${tagFilter.value}")`);
            }
          }
        }
        
        if (tagConditions.length > 0) {
          return tagConditions.join(' OR ');
        }
      }
      
      // Invalid tag format - return null
      return null;
    }

    // Handle tag-based fields
    if (requiresCatalogTag(fieldName)) {
      return this.processCatalogTagField(fieldName, value);
    }

    // Handle numeric fields with operators
    if (this.isNumberFilter(value)) {
      return this.formatNumberFilter(fieldName, value, mapping);
    }

    // Handle date fields
    if (this.isDateFilter(value)) {
      return this.formatDateFilter(fieldName, value, mapping);
    }

    // Handle boolean fields
    if (typeof value === 'boolean') {
      return this.formatBooleanField(fieldName, value, mapping);
    }

    // Handle string fields
    if (typeof value === 'string') {
      return this.formatStringField(fieldName, value, mapping);
    }

    // Handle array fields
    if (Array.isArray(value)) {
      return this.formatArrayField(fieldName, value, mapping);
    }

    return null;
  }

  private static processCatalogTagField(fieldName: string, value: any): string | null {
    const mapping = getFieldMapping(fieldName);
    if (!mapping) {
      return null;
    }

    // Special handling for tags with dynamic tagHierarchy
    if (fieldName === 'tags' && typeof value === 'object' && value.tagHierarchy && value.value) {
      const tagHierarchy = value.tagHierarchy;
      const val = value.value;
      if (!tagHierarchy) return null;
      
      if (Array.isArray(val)) {
        const quotedValues = val.map(v => `"${v}"`).join(',');
        return `catalog_tag.${tagHierarchy} in (${quotedValues})`;
      } else {
        return `catalog_tag.${tagHierarchy} in ("${val}")`;
      }
    }

    const tagHierarchy = getTagHierarchy(fieldName);
    const queryTemplate = getTagQueryTemplate(fieldName);
    if (!queryTemplate) return null;

    // Apply value mapping if available
    const mapValue = (val: string): string => {
      if (mapping.valueMapping && mapping.valueMapping[val]) {
        return mapping.valueMapping[val];
      }
      return val;
    };

    // Handle numeric filters (for riskScore)
    if (this.isNumberFilter(value)) {
      const mappedValue = mapValue(value.value.toString());
      const operator = getOperatorMapping(value.operator);
      return queryTemplate
        .replace('{tagHierarchy}', tagHierarchy || '')
        .replace('{operator}', operator)
        .replace('{value}', mappedValue);
    }

    // Handle string values
    if (typeof value === 'string') {
      const mappedValue = mapValue(value);
      const template = mapping.singleValueTemplate || queryTemplate;
      return template
        .replace('{tagHierarchy}', tagHierarchy || '')
        .replace('{value}', mappedValue);
    }
    
    // Handle array values
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      const mappedValues = value.map(mapValue);
      const quotedValues = mappedValues.map(v => `"${v}"`).join(',');
      return queryTemplate
        .replace('{tagHierarchy}', tagHierarchy || '')
        .replace('{value_list}', quotedValues);
    }

    return null;
  }

  private static formatBooleanField(fieldName: string, value: boolean, mapping: any): string | null {
    const bigidFieldName = mapping.bigidField;

    if (mapping.conversionType === 'to_bool') {
      return `${bigidFieldName}=to_bool(${value})`;
    }

    // Handle special boolean fields
    if (fieldName === 'containsPI') {
      return value ? 'total_pii_count > to_number(0)' : 'total_pii_count = to_number(0)';
    }

    return `${bigidFieldName}="${value}"`;
  }

  private static formatStringField(fieldName: string, value: string, mapping: any): string | null {
    const bigidFieldName = mapping.bigidField;

    // Handle regex patterns (starting with / and ending with /) - only for fileName
    if (fieldName === 'fileName' && value.startsWith('/') && value.endsWith('/')) {
      return `${bigidFieldName}=${value}`;
    }

    // Handle wildcard patterns for fileName (wildcards work directly in BigID)
    if (fieldName === 'fileName' && (value.includes('*') || value.includes('?'))) {
      // For wildcard patterns, use them directly without regex conversion
      return `${bigidFieldName}="${value}"`;
    }

    // Handle regex alternation for fileName only
    if (fieldName === 'fileName' && value.includes('|')) {
      return `${bigidFieldName}=/${value}/`;
    }

    // For other fields, no pattern matching support based on test results
    return `${bigidFieldName}="${value}"`;
  }

  private static formatArrayField(fieldName: string, values: string[], mapping: any): string | null {
    if (values.length === 0) return null;

    const bigidFieldName = mapping.bigidField;

    if (values.length === 1) {
      return this.formatStringField(fieldName, values[0], mapping);
    }

    const quotedValues = values.map(v => `"${v}"`).join(',');
    return `${bigidFieldName} IN (${quotedValues})`;
  }

  private static formatNumberFilter(fieldName: string, filter: NumberFilter, mapping: any): string | null {
    const bigidFieldName = mapping.bigidField;
    const operator = getOperatorMapping(filter.operator);
    
    // Check for notEqual operator which causes errors
    if (filter.operator === 'notEqual') {
      console.warn(`Warning: 'notEqual' operator is known to cause errors in BigID API for field '${fieldName}'. Consider using other operators.`);
      // Still generate the query but warn about potential issues
    }
    
    // Use to_number function for BigID numeric fields
    return `${bigidFieldName} ${operator} to_number(${filter.value})`;
  }

  private static formatDateFilter(fieldName: string, filter: DateFilter, mapping: any): string | null {
    const bigidFieldName = mapping.bigidField;
    const operator = getOperatorMapping(filter.operator);

    // Check for notEqual operator which causes errors
    if (filter.operator === 'notEqual') {
      console.warn(`Warning: 'notEqual' operator is known to cause errors in BigID API for field '${fieldName}'. Consider using other operators.`);
      // Still generate the query but warn about potential issues
    }

    let dateValue: string;

    if (typeof filter.value === 'string') {
      // ISO date string - use to_date function
      dateValue = `to_date(${filter.value})`;
    } else {
      // Relative date - use past function
      const relDate = filter.value as RelativeDate;
      if (relDate.type === 'past') {
        dateValue = `past("${relDate.amount}${relDate.unit}")`;
      } else {
        // Future dates not supported in spec - convert to past with negative
        dateValue = `past("-${relDate.amount}${relDate.unit}")`;
      }
    }

    return `${bigidFieldName} ${operator} ${dateValue}`;
  }

  private static isNumberFilter(value: any): value is NumberFilter {
    return value && typeof value === 'object' && 
           typeof value.value === 'number' && 
           typeof value.operator === 'string';
  }

  private static isDateFilter(value: any): value is DateFilter {
    return value && typeof value === 'object' && 
           (typeof value.value === 'string' || this.isRelativeDate(value.value)) && 
           typeof value.operator === 'string';
  }

  private static isRelativeDate(value: any): value is RelativeDate {
    return value && typeof value === 'object' && 
           typeof value.type === 'string' && 
           typeof value.amount === 'number' && 
           typeof value.unit === 'string';
  }

  /**
   * Get validation warnings for a filter
   */
  static getValidationWarnings(filter: StructuredFilter): string[] {
    const warnings: string[] = [];

    for (const [fieldName, value] of Object.entries(filter)) {
      if (value === null || value === undefined) continue;

      // Check for broken parameters
      if (isBrokenParameter(fieldName)) {
        warnings.push(`Parameter '${fieldName}' is known to not work in BigID API: ${getParameterNotes(fieldName)}`);
      }

      // Check for no-data parameters
      if (isNoDataParameter(fieldName)) {
        warnings.push(`Parameter '${fieldName}' exists but has no data available: ${getParameterNotes(fieldName)}`);
      }

      // Check for partially working parameters
      if (isPartiallyWorkingParameter(fieldName)) {
        warnings.push(`Parameter '${fieldName}' is partially working: ${getParameterNotes(fieldName)}`);
      }

      // Check entity type validation
      if (fieldName === 'entityType') {
        if (Array.isArray(value)) {
          const invalidTypes = value.filter(type => !isValidEntityType(type));
          if (invalidTypes.length > 0) {
            warnings.push(`Unsupported entity types: ${invalidTypes.join(', ')}. Supported: ${getSupportedEntityTypes().join(', ')}`);
          }
        } else if (typeof value === 'string' && !isValidEntityType(value)) {
          warnings.push(`Unsupported entity type: ${value}. Supported: ${getSupportedEntityTypes().join(', ')}`);
        }
      }

      // Check sensitivity validation
      if (fieldName === 'sensitivity') {
        if (Array.isArray(value)) {
          const invalidValues = value.filter(val => !isValidSensitivityValue(val));
          if (invalidValues.length > 0) {
            warnings.push(`Invalid sensitivity values: ${invalidValues.join(', ')}. Valid: ${getSystemSensitivityValues().join(', ')}`);
          }
        } else if (typeof value === 'string' && !isValidSensitivityValue(value)) {
          warnings.push(`Invalid sensitivity value: ${value}. Valid: ${getSystemSensitivityValues().join(', ')}`);
        }
      }

      // Check for notEqual operator usage
      if (this.isNumberFilter(value) && (value as NumberFilter).operator === 'notEqual') {
        warnings.push(`'notEqual' operator is known to cause errors in BigID API for field '${fieldName}'. Consider using other operators.`);
      }

      if (this.isDateFilter(value) && (value as DateFilter).operator === 'notEqual') {
        warnings.push(`'notEqual' operator is known to cause errors in BigID API for field '${fieldName}'. Consider using other operators.`);
      }
    }

    return warnings;
  }

  /**
   * Convert filter with validation and warnings
   */
  static convertToBigIDQueryWithValidation(filter: StructuredFilter): { query: string; warnings: string[] } {
    const warnings = this.getValidationWarnings(filter);
    const query = this.convertToBigIDQuery(filter);
    
    return { query, warnings };
  }

  /**
   * Get recommended working parameters based on test results
   */
  static getRecommendedParameters(): string[] {
    return [
      'containsPI', 'entityType', 'sensitivity', 'fileType', 'fileSize', 'sizeInBytes',
      'modifiedDate', 'createdDate', 'lastScanned', 'lastAccessedDate',
      'datasource', 'source', 'scanStatus', 'isEncrypted', 'totalRows', 'customQuery'
    ];
  }

  /**
   * Get parameters to avoid based on test results
   */
  static getParametersToAvoid(): string[] {
    return [
      'system', 'fileOwner', 'fileCreator', 'encryptionStatus', 'accessLevel', 'status',
      'tags', 'classification', 'scannerType', 'schemaName', 'tableName', 'columnName',
      'dataType', 'objectName', 'objectType', 'detailedObjectType', 'riskScore', 'dataQualityScore'
    ];
  }

  /**
   * Get best practices for using the filter
   */
  static getBestPractices(): string[] {
    return [
      'Use array syntax for multiple values: ["csv", "xlsx"]',
      'Always use parentheses in customQuery: "(total_pii_count > 100)"',
      'Prefer ISO date strings over relative dates for consistency',
      'Combine working parameters for complex filtering',
      'Use entityType instead of system for data source type filtering',
      'Use datasource for specific data source filtering',
      'Avoid notEqual operator as it causes errors',
      'Use wildcards for fileName but not regex patterns',
      'Use containsPI for PII detection filtering',
      'Use sensitivity for data classification filtering'
    ];
  }

  /**
   * Utility method to create example filters for testing
   */
  static createExampleFilters(): StructuredFilter[] {
    return [
      // WORKING PARAMETERS (CONFIRMED BY TEST RESULTS)
      {
        entityType: 'file'
      },
      {
        containsPI: true
      },
      {
        sensitivity: 'High'
      },
      {
        fileType: 'csv'
      },
      {
        fileSize: {
          operator: 'greaterThan',
          value: 1000000
        }
      },
      {
        modifiedDate: {
          operator: 'lessThan',
          value: {
            type: 'past',
            amount: 1,
            unit: 'y'
          }
        }
      },
      {
        createdDate: {
          operator: 'greaterThan',
          value: '2024-01-01T00:00:00.000Z'
        }
      },
      {
        lastScanned: {
          operator: 'greaterThan',
          value: {
            type: 'past',
            amount: 30,
            unit: 'd'
          }
        }
      },
      {
        lastAccessedDate: {
          operator: 'lessThan',
          value: {
            type: 'past',
            amount: 1,
            unit: 'y'
          }
        }
      },
      {
        datasource: 'Data in Motion'
      },
      {
        scanStatus: 'Completed'
      },
      {
        isEncrypted: false
      },
      {
        totalRows: {
          operator: 'greaterThan',
          value: 1000
        }
      },
      {
        customQuery: '(total_pii_count > 100)'
      },
      
      // COMPLEX WORKING COMBINATIONS
      {
        containsPI: true,
        fileType: 'csv'
      },
      {
        sensitivity: ['High', 'Medium'],
        createdDate: {
          operator: 'greaterThan',
          value: '2024-01-01T00:00:00.000Z'
        }
      },
      {
        entityType: 'file',
        fileSize: {
          operator: 'greaterThan',
          value: 1000000
        },
        modifiedDate: {
          operator: 'lessThan',
          value: {
            type: 'past',
            amount: 1,
            unit: 'y'
          }
        }
      }
    ];
  }

  // Commented out to prevent stdout interference with MCP server
  /*
  static testConversions(): void {
    console.log('Testing FilterConverter with real-world behavior...\n');

    const examples = this.createExampleFilters();

    examples.forEach((filter, index) => {
      console.log(`Example ${index + 1}:`, JSON.stringify(filter, null, 2));
      console.log('Result:', this.convertToBigIDQuery(filter));
      console.log('---\n');
    });
  }
  */
} 