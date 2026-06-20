# Token Storage Security Fix - Per-Tenant Tracking

## Overview
This document describes the security improvements made to fix the replay attack vulnerability in token usage tracking, including the migration to per-tenant tracking instead of per-deployment-environment tracking.

## Problem: Replay Attack Vulnerability

### Original Implementation
The original implementation stored token usage in **TPA storage** (BigID client-controlled storage) with the following approach:
- Token usage was stored in client-side storage (TPA storage)
- Usage data was signed with HMAC-SHA256 using an APP_SECRET
- Signature included date-salting to invalidate old data

### Vulnerabilities
Despite the cryptographic signing, this approach was vulnerable to replay attacks:

1. **Client Control**: Since data was stored in TPA storage, malicious clients could:
   - Delete their usage data to reset counts
   - Prevent writes from completing by blocking storage operations
   - Replay older signed data from earlier in the day with lower usage counts

2. **Same-Day Replay**: While date-salting prevented cross-day replay attacks, it couldn't prevent same-day replays where an attacker could:
   - Capture signed usage data early in the day
   - Use significant tokens throughout the day
   - Replace the high usage data with the earlier low usage data
   - Continue using tokens beyond their limit

## Solution: Server-Side Firestore Storage

### New Architecture
Token usage is now stored in **Google Cloud Firestore**, a server-controlled database:

```
┌─────────────────────────────────────────────────┐
│  Client Application                             │
│  (Cannot modify token usage directly)           │
└────────────────┬────────────────────────────────┘
                 │
                 │ Token usage requests
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Application Server                             │
│  - Checks usage limits                          │
│  - Tracks token consumption                     │
│  - Enforces per-environment limits              │
└────────────────┬────────────────────────────────┘
                 │
                 │ Read/Write operations
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Google Cloud Firestore                         │
│  - Server-controlled storage                    │
│  - Atomic transactions                          │
│  - Per-environment databases                    │
│  - IAM-protected access                         │
└─────────────────────────────────────────────────┘
```

### Key Security Improvements

1. **Server-Side Control**: 
   - Token usage is stored in Firestore, which clients cannot directly modify
   - Only the application server has write access via service account credentials

2. **Atomic Transactions**: 
   - Token increments use Firestore transactions to prevent race conditions
   - Ensures accurate counting even under concurrent usage

3. **Per-Environment Isolation**:
   - Each environment (dev, production) has its own Firestore database
   - Configured via Terraform infrastructure
   - Environment isolation prevents cross-environment attacks

4. **IAM Protection**:
   - Access controlled by Google Cloud IAM roles
   - Service account has minimal required permissions (datastore.user)
   - No direct client access to the database

## Implementation Details

### Firestore Database Setup
Each environment gets its own Firestore database:
- **Production**: `bigid-agentic-app-usage`
- **Development**: `bigid-agentic-app-usage-dev`

### Document Structure
```
Collection: token_usage
Document ID: {tenantId}_{date}
Fields:
  - usage: number (total tokens used)
  - tenantId: string (hashed tenant identifier)
  - tenantUrl: string (BigID tenant URL for lookup)
  - date: string (YYYY-MM-DD)
  - lastUpdated: timestamp
  - createdAt: timestamp
```

**Key Design Decision: Per-Tenant Tracking**

Usage is tracked per BigID tenant (identified by their unique URL) rather than per deployment environment. This means:
- Multiple BigID tenants can use the same deployment (dev or production)
- Each tenant has their own independent token usage limits
- Usage cannot be shared or transferred between tenants
- The system creates a safe, consistent identifier (hash) from the tenant's URL
- The original tenant URL is stored for lookup and auditing


### Transaction Flow
```javascript
// Check if usage is allowed
1. Validate that bigidBaseUrl is present (SECURITY REQUIREMENT)
2. Generate tenant identifier from bigidBaseUrl
3. Query Firestore for today's usage for this tenant
4. Compare against DAILY_TOKEN_LIMIT
5. Allow or deny request

// Track usage after AI call
1. Validate that bigidBaseUrl is present (SECURITY REQUIREMENT)
2. Generate tenant identifier from bigidBaseUrl
3. Start Firestore transaction
4. Read current usage for today for this tenant
5. Add new token count
6. Write updated total back (including tenant URL for lookup)
7. Commit transaction (atomic)
```

**Security Enforcement:**
- All requests MUST include a valid BigID tenant URL
- Requests without a valid URL are rejected as if the limit is exceeded
- This ensures all usage is properly tracked and attributed to a tenant

## Files Modified

### Core Changes
1. **server/firestoreService.js** (NEW)
   - Firestore client initialization
   - `getUsageForEnvironment()` - Read current usage
   - `incrementUsageForEnvironment()` - Atomic increment
   - `getUsageHistory()` - Historical data retrieval

2. **server/usageTracker.js** (MODIFIED)
   - Removed client-side storage logic
   - Removed HMAC signing/verification code
   - Now uses Firestore service for all storage operations
   - Added `getTenantIdentifier()` function to create safe tenant IDs from URLs
   - Updated `checkUsageLimits()` to accept `bigidBaseUrl` parameter
   - Updated `trackUsage()` to accept `bigidBaseUrl` parameter
   - Added validation to reject requests without valid tenant URL
   - Changed from environment-based to tenant-based tracking

3. **server/routes.js** (MODIFIED)
   - Updated `/api/usage-limits` to require and pass `bigidBaseUrl` from query params
   - Updated `/api/track-usage` to extract and pass `bigidBaseUrl` from request body
   - Added validation to reject requests without tenant URL
   - Returns `tenantId` and `tenantUrl` in responses for tracking

4. **server/socket.js** (MODIFIED)
   - Stores `bigidBaseUrl` in chat session for per-tenant tracking
   - Updated all `checkUsageLimits()` calls to pass `bigidBaseUrl`
   - Updated all `trackUsage()` calls to pass `bigidBaseUrl`
   - Updated error messages to refer to "tenant" instead of "environment"

### Infrastructure
5. **server/firestoreService.js** (MODIFIED)
   - Updated `incrementUsageForEnvironment()` to accept `tenantUrl` parameter
   - Added `tenantUrl` field to stored documents for lookup capability
   - Added `getUsageByUrl()` function to query usage by tenant URL
   - Changed field name from `environmentName` to `tenantId` for clarity

6. **terraform/production/main.tf** (MODIFIED)
   - Added Firestore API enablement
   - Created production Firestore database: `bigid-agentic-app-usage`
   - Granted service account datastore.user role
   - Added FIRESTORE_DATABASE environment variable

7. **terraform/dev/main.tf** (MODIFIED)
   - Added Firestore API enablement
   - Created dev Firestore database: `bigid-agentic-app-usage-dev`
   - Granted service account datastore.user role
   - Added FIRESTORE_DATABASE environment variable

### Configuration
8. **package.json** (MODIFIED)
   - Added @google-cloud/firestore dependency

9. **.env.example** (MODIFIED)
   - Removed APP_SECRET (no longer needed for cryptographic signing)
   - Added FIRESTORE_DATABASE documentation
   - Clarified that ENVIRONMENT_NAME is still used but for deployment context only

## Deployment Steps

### Prerequisites
- Google Cloud project with billing enabled
- Terraform installed
- Application Default Credentials configured

### Steps
1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Deploy Infrastructure**
   ```bash
   cd terraform/production  # or terraform/dev
   terraform init
   terraform plan
   terraform apply
   ```

3. **Environment Variables**
   The following are automatically set by Terraform:
   - `FIRESTORE_DATABASE` - Set to the created database name
   - `ENVIRONMENT_NAME` - Set via terraform variables

4. **Deploy Application**
   - Build and push Docker image
   - Cloud Run will automatically use the configured Firestore database

## Security Benefits

### Attack Mitigation
| Attack Vector | Old System | New System |
|--------------|------------|------------|
| Delete usage data | ✅ Possible | ❌ Prevented (server-side only) |
| Replay old signatures | ✅ Possible (same day) | ❌ N/A (no signatures) |
| Block storage writes | ✅ Possible | ❌ Prevented (atomic transactions) |
| Race conditions | ⚠️ Possible | ❌ Prevented (transactions) |
| Cross-tenant usage sharing | ⚠️ Possible | ❌ Prevented (per-tenant tracking) |
| Missing tenant URL | ⚠️ Not enforced | ❌ Blocked (validation required) |

### Additional Benefits
1. **Audit Trail**: Firestore provides built-in audit logging
2. **Backup & Recovery**: Automatic backups of usage data
3. **Scalability**: Firestore handles high concurrency automatically
4. **Monitoring**: Integration with Cloud Monitoring for usage alerts

## Breaking Changes

The updated system requires the following changes to calling code:

### Required Parameters
- `checkUsageLimits(bigidBaseUrl)` - Now requires `bigidBaseUrl` parameter
- `trackUsage(tokenCount, bigidBaseUrl)` - Now requires `bigidBaseUrl` parameter

### API Endpoints
- `GET /api/usage-limits` - Now requires `bigidBaseUrl` query parameter
- `POST /api/track-usage` - Now requires `bigidContext.bigidBaseUrl` in request body

### Security Enforcement
- All requests without a valid `bigidBaseUrl` are rejected
- The system returns an error as if the token limit is exceeded
- This ensures all usage is properly tracked and attributed

## Per-Tenant vs Per-Environment Tracking

### Why Per-Tenant?

The original implementation tracked usage per deployment environment (dev/production). However, in practice:
- Multiple BigID tenants use the same deployment
- Each tenant should have independent usage limits
- Usage should not be shared between different customers/organizations

### Tenant Identifier Creation

```javascript
// Example tenant URL: https://customer1.bigid.cloud
// Generated tenant ID: customer1-bigid-cloud_a1b2c3d4e5f6g7h8

function getTenantIdentifier(bigidBaseUrl) {
    // 1. Extract hostname from URL
    // 2. Sanitize hostname (replace special chars with dashes)
    // 3. Create hash for uniqueness and length control
    // 4. Combine sanitized prefix with hash for readability
    return `${sanitized}_${hash}`;
}
```

This approach:
- Creates consistent identifiers for the same tenant
- Handles long/complex hostnames safely
- Provides some human-readability for debugging
- Stores original URL for lookup and auditing

## Testing

### Local Development
1. Set up Application Default Credentials:
   ```bash
   gcloud auth application-default login
   ```

2. Set environment variables:
   ```bash
   export DAILY_TOKEN_LIMIT=10000
   export ENVIRONMENT_NAME=development
   export FIRESTORE_DATABASE=(default)  # or your custom database
   ```

3. Run the application:
   ```bash
   npm run dev
   ```

### Verify Security
1. Attempt to modify usage via client tools (should fail)
2. Verify usage persists across server restarts
3. Test concurrent usage tracking
4. Verify daily resets at midnight

## Monitoring

### Key Metrics to Monitor
1. **Usage per environment**: Track token consumption trends
2. **Rate limit hits**: Monitor how often limits are reached
3. **Firestore operations**: Watch for unusual patterns
4. **Error rates**: Track any Firestore operation failures

### Cloud Console Queries
```sql
-- View recent usage
SELECT * FROM token_usage 
WHERE date >= CURRENT_DATE() - 7
ORDER BY date DESC

-- Monitor high usage environments
SELECT environmentName, SUM(usage) as total
FROM token_usage
WHERE date = CURRENT_DATE()
GROUP BY environmentName
ORDER BY total DESC
```

## Future Enhancements

Potential improvements for the future:
1. **Usage Analytics Dashboard**: Real-time usage visualization
2. **Dynamic Limits**: Per-user or per-team token limits
3. **Cost Allocation**: Track and report token costs by usage
4. **Alerting**: Proactive notifications when approaching limits
5. **Rate Limiting**: Per-minute/hour limits in addition to daily

## Conclusion

This security fix eliminates the replay attack vulnerability and implements proper per-tenant tracking by moving token storage from client-controlled TPA storage to server-controlled Firestore. The new implementation provides:

- **Strong Security**: Server-side control prevents client manipulation
- **Atomic Operations**: Firestore transactions prevent race conditions
- **Per-Tenant Tracking**: Independent limits for each BigID tenant
- **Mandatory Tracking**: All requests must include tenant URL
- **Audit Trail**: Full history with tenant URL for lookup
- **Scalability**: Handles multiple tenants on same deployment

### Key Security Improvements

1. **Client Cannot Manipulate Data**: All usage stored server-side in Firestore
2. **Per-Tenant Isolation**: Each BigID tenant tracked independently
3. **Mandatory Attribution**: Requests without tenant URL are rejected
4. **Atomic Updates**: No race conditions in concurrent usage
5. **Queryable by URL**: Can look up usage by tenant URL for auditing

The client can no longer manipulate usage data, and each tenant's usage is properly isolated and tracked, ensuring accurate token limit enforcement for all BigID customers using the same deployment.
