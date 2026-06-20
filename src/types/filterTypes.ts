export interface NumberFilter {
  operator: 'equal' | 'notEqual' | 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual';
  value: number;
}

export interface DateFilter {
  operator: 'equal' | 'notEqual' | 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual';
  value: string | RelativeDate;
}

export interface RelativeDate {
  type: 'past' | 'future';
  amount: number;
  unit: 'y' | 'm' | 'd' | 'h' | 'min' | 's';
}

export interface TagFilter {
  tagHierarchy: string;
  value: string | string[];
}

export interface StructuredFilter {
  // CORE WORKING FILTERS
  containsPI?: boolean;
  entityType?: string | string[];
  sensitivity?: string | string[];
  
  // FILE SPECIFIC
  fileName?: string;
  fileType?: string | string[];
  fileSize?: NumberFilter;
  sizeInBytes?: NumberFilter; // Added back - maps to sizeInBytes
  fileOwner?: string;
  fileCreator?: string;
  
  // DATE FILTERS
  modifiedDate?: DateFilter;
  createdDate?: DateFilter;
  lastScanned?: DateFilter;
  lastAccessedDate?: DateFilter; // Added back - maps to last_opened
  
  // DATA SOURCE
  datasource?: string | string[];
  source?: string | string[];
  system?: string | string[]; // Added back - maps to type
  
  // DATABASE SPECIFIC  
  schemaName?: string | string[];
  tableName?: string | string[];
  dataType?: string | string[];
  totalRows?: NumberFilter;
  
  // OBJECT PROPERTIES
  objectName?: string;
  objectType?: string | string[];
  detailedObjectType?: string | string[];
  
  // SCAN STATUS
  scanStatus?: string | string[];
  scannerType?: string | string[];
  
  // SECURITY
  isEncrypted?: boolean;
  encryptionStatus?: string | string[];
  accessLevel?: string | string[]; // Added back - maps to accessLevel
  

  
  // STATUS
  status?: string | string[];
  
  // TAGS AND CLASSIFICATION
  tags?: TagFilter | TagFilter[]; // REQUIRED FORMAT: Use TagFilter with tagHierarchy and value
  
  // ADVANCED - Raw BigID query language for complex filters
  customQuery?: string;
}

// Updated JSON Schema for the structured filter with all parameters working
export const StructuredFilterSchema = {
  type: 'object',
  description: 'Complete structured filter with all parameters working and proper BigID field mappings',
  properties: {
    // CORE WORKING FILTERS
    containsPI: {
      description: 'Whether object contains personally identifiable information',
      type: 'boolean'
    },
    
    entityType: {
      description: 'Entity type - use actual values from data: file, rdb, APP, etc.',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    sensitivity: {
      description: 'Sensitivity level - matches tag values like High, Medium, Low, Restricted, Confidential, Internal Use',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    // FILE SPECIFIC
    fileName: {
      description: 'File name with simple regex support. Supports: simple regex patterns (/.*\\.csv$/), and alternation (email|mail). Does NOT support regex patterns with parentheses (capturing groups, lookahead, lookbehind) - these will cause API errors.',
      type: 'string'
    },
    
    fileType: {
      description: 'File extensions: csv, pdf, xlsx, txt, etc.',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    fileSize: {
      description: 'File size in bytes',
      type: 'object',
      properties: {
        operator: {"enum": ["equal", "notEqual", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual"]},
        value: {"type": "number"}
      },
      required: ["operator", "value"]
    },
    
    sizeInBytes: {
      description: 'File size in bytes (alternative to fileSize)',
      type: 'object',
      properties: {
        operator: {"enum": ["equal", "notEqual", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual"]},
        value: {"type": "number"}
      },
      required: ["operator", "value"]
    },
    
    fileOwner: {
      description: 'File owner with wildcard/regex support. LIMITATION: Parentheses in regex patterns (capturing groups, lookahead, lookbehind) are not supported by the BigID API and will cause errors.',
      type: 'string'
    },
    
    fileCreator: {
      description: 'File creator with wildcard/regex support. LIMITATION: Parentheses in regex patterns (capturing groups, lookahead, lookbehind) are not supported by the BigID API and will cause errors.',
      type: 'string'
    },
    
    // DATE FILTERS
    modifiedDate: {
      description: 'Last modified date filter',
      type: 'object',
      properties: {
        operator: {"enum": ["equal", "notEqual", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual"]},
        value: {
          oneOf: [
            {"type": "string", "description": "ISO date: 2023-01-01T00:00:00.000Z"},
            {
              "type": "object",
              "description": "Relative date",
              properties: {
                type: {"enum": ["past", "future"]},
                amount: {"type": "number"},
                unit: {"enum": ["y", "m", "d", "h", "min", "s"]}
              },
              required: ["type", "amount", "unit"]
            }
          ]
        }
      },
      required: ["operator", "value"]
    },
    
    createdDate: {
      description: 'Created date filter - same structure as modifiedDate',
      type: 'object',
      properties: {
        operator: {"enum": ["equal", "notEqual", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual"]},
        value: {
          oneOf: [
            {"type": "string"},
            {
              "type": "object",
              properties: {
                type: {"enum": ["past", "future"]},
                amount: {"type": "number"}, 
                unit: {"enum": ["y", "m", "d", "h", "min", "s"]}
              },
              required: ["type", "amount", "unit"]
            }
          ]
        }
      },
      required: ["operator", "value"]
    },
    
    lastScanned: {
      description: 'Last scan date filter - same structure as date filters',
      type: 'object',
      properties: {
        operator: {"enum": ["equal", "notEqual", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual"]},
        value: {
          oneOf: [
            {"type": "string"},
            {
              "type": "object", 
              properties: {
                type: {"enum": ["past", "future"]},
                amount: {"type": "number"},
                unit: {"enum": ["y", "m", "d", "h", "min", "s"]}
              },
              required: ["type", "amount", "unit"]
            }
          ]
        }
      },
      required: ["operator", "value"]
    },
    
    lastAccessedDate: {
      description: 'Last accessed date filter - maps to last_opened',
      type: 'object',
      properties: {
        operator: {"enum": ["equal", "notEqual", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual"]},
        value: {
          oneOf: [
            {"type": "string"},
            {
              "type": "object", 
              properties: {
                type: {"enum": ["past", "future"]},
                amount: {"type": "number"},
                unit: {"enum": ["y", "m", "d", "h", "min", "s"]}
              },
              required: ["type", "amount", "unit"]
            }
          ]
        }
      },
      required: ["operator", "value"]
    },
    
    // DATA SOURCE
    datasource: {
      description: 'Data source name/identifier',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    source: {
      description: 'Source system name (alternative to datasource)',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    system: {
      description: 'Data source system name (maps to type field)',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    // DATABASE SPECIFIC  
    schemaName: {
      description: 'Database schema name',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    tableName: {
      description: 'Database table name', 
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    dataType: {
      description: 'Database column data type',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    totalRows: {
      description: 'Total number of rows in structured data',
      type: 'object',
      properties: {
        operator: {"enum": ["equal", "notEqual", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual"]},
        value: {"type": "number"}
      },
      required: ["operator", "value"]
    },
    
    // OBJECT PROPERTIES
    objectName: {
      description: 'Object name with wildcard/regex support. LIMITATION: Parentheses in regex patterns (capturing groups, lookahead, lookbehind) are not supported by the BigID API and will cause errors.',
      type: 'string'
    },
    
    objectType: {
      description: 'Object type classification',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    detailedObjectType: {
      description: 'Detailed object type: STRUCTURED, UNSTRUCTURED, STRUCTURED_FILE, etc.',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    // SCAN STATUS
    scanStatus: {
      description: 'Scan status: Completed, Failed, InProgress, etc.',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    scannerType: {
      description: 'Scanner type: smb, s3-v2, confluence-v2, etc.',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    // SECURITY
    isEncrypted: {
      description: 'Whether object is encrypted',
      type: 'boolean'
    },
    
    encryptionStatus: {
      description: 'Encryption status classification',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    accessLevel: {
      description: 'Access level: ReadOnly, ReadWrite, etc.',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    

    
    // STATUS
    status: {
      description: 'Object status: Active, Inactive, etc.',
      oneOf: [{"type": "string"}, {"items": {"type": "string"}, "type": "array"}]
    },
    
    // TAGS AND CLASSIFICATION
    tags: {
      description: "Tags applied to the object - requires hierarchy format for filtering",
      oneOf: [
        {
          description: "Tag filter with tag hierarchy (REQUIRED FORMAT)",
          type: "object",
          properties: {
            tagHierarchy: {
              type: "string",
              description: "Name of the tag hierarchy (e.g., 'system.risk.riskGroup', 'system.sensitivityClassification.Sensitivity', 'Sen.Priority')",
              examples: [
                "system.risk.riskGroup",
                "system.sensitivityClassification.Sensitivity",
                "system.sensitivityClassification.CoPilot", 
                "Sen.Priority",
                "Snowflake.masked",
                "system.remediation.Remediation"
              ]
            },
            value: {
              oneOf: [
                {
                  type: "string",
                  description: "Single tag value",
                  examples: ["high", "medium", "low", "Confidential", "P1", "true"]
                },
                {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  description: "Multiple tag values (OR logic)",
                  examples: [["high", "medium"], ["Confidential", "Restricted"]]
                }
              ]
            }
          },
          required: ["tagHierarchy", "value"]
        }
      ]
    },
    
    // ADVANCED - Raw BigID query language for complex filters
    customQuery: {
      description: 'Raw BigID query language expression for complex filtering when structured options insufficient. LIMITATION: Parentheses in regex patterns (capturing groups, lookahead, lookbehind) are not supported by the BigID API and will cause errors.',
      type: 'string',
      examples: [
        'type="file"',
        'tags="PII"', 
        'source="mysql" AND entityType="database"',
        'sizeInBytes>to_number(1000000)',
        'last_opened<past("5y")',
        'fileName=/.*\\.csv$/',
        'columnOrFieldOccurrencesCounter=elementmatch(fieldName=/Email|email/)'
      ]
    }
  }
}; 