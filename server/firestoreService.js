const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore with automatic GCP credentials
let firestoreInstance = null;

function getFirestoreInstance() {
    if (!firestoreInstance) {
        const databaseId = process.env.FIRESTORE_DATABASE || '(default)';
        firestoreInstance = new Firestore({
            // Will automatically use Application Default Credentials (ADC)
            // This works in GCP environments (Cloud Run, etc.) and with gcloud auth
            databaseId: databaseId
        });
        console.log(`Firestore initialized with database: ${databaseId}`);
    }
    return firestoreInstance;
}

// Collection names
const USAGE_COLLECTION = 'token_usage';
const PROMPTS_COLLECTION = 'prompt_logs';

/**
 * Get token usage for a specific environment and date
 * @param {string} environmentName - The environment identifier
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<number>} Current usage count
 */
async function getUsageForEnvironment(environmentName, date) {
    try {
        const firestore = getFirestoreInstance();
        const docRef = firestore.collection(USAGE_COLLECTION).doc(`${environmentName}_${date}`);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return 0;
        }
        
        const data = doc.data();
        return data.usage || 0;
    } catch (error) {
        console.error('Error reading usage from Firestore:', error);
        throw new Error(`Failed to read usage from Firestore: ${error.message}`);
    }
}

/**
 * Increment token usage for a specific environment and date
 * @param {string} environmentName - The environment identifier (tenant ID hash)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} tokenCount - Number of tokens to add
 * @param {string} tenantUrl - The BigID tenant URL for lookup
 * @returns {Promise<number>} New total usage
 */
async function incrementUsageForEnvironment(environmentName, date, tokenCount, tenantUrl = null) {
    try {
        const firestore = getFirestoreInstance();
        const docId = `${environmentName}_${date}`;
        const docRef = firestore.collection(USAGE_COLLECTION).doc(docId);
        
        // Use transaction to ensure atomic increment
        const newUsage = await firestore.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            
            const currentUsage = doc.exists ? (doc.data().usage || 0) : 0;
            const newTotal = currentUsage + tokenCount;
            
            const updateData = {
                usage: newTotal,
                tenantId: environmentName,
                date: date,
                lastUpdated: Firestore.FieldValue.serverTimestamp()
            };
            
            // Store tenant URL for lookup capability
            if (tenantUrl) {
                updateData.tenantUrl = tenantUrl;
            }
            
            if (doc.exists) {
                transaction.update(docRef, updateData);
            } else {
                transaction.set(docRef, {
                    ...updateData,
                    createdAt: Firestore.FieldValue.serverTimestamp()
                });
            }
            
            return newTotal;
        });
        
        return newUsage;
    } catch (error) {
        console.error('Error incrementing usage in Firestore:', error);
        throw new Error(`Failed to increment usage in Firestore: ${error.message}`);
    }
}

/**
 * Get usage statistics for an environment across multiple days
 * @param {string} environmentName - The environment identifier (tenant ID hash)
 * @param {number} days - Number of days to look back (default 7)
 * @returns {Promise<Array>} Array of usage records
 */
async function getUsageHistory(environmentName, days = 7) {
    try {
        const firestore = getFirestoreInstance();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
        
        const snapshot = await firestore.collection(USAGE_COLLECTION)
            .where('tenantId', '==', environmentName)
            .where('date', '>=', cutoffDateStr)
            .orderBy('date', 'desc')
            .get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error reading usage history from Firestore:', error);
        throw new Error(`Failed to read usage history from Firestore: ${error.message}`);
    }
}

/**
 * Get usage for a specific tenant URL and date
 * @param {string} tenantUrl - The BigID tenant URL
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Usage record or null if not found
 */
async function getUsageByUrl(tenantUrl, date) {
    try {
        const firestore = getFirestoreInstance();
        
        const snapshot = await firestore.collection(USAGE_COLLECTION)
            .where('tenantUrl', '==', tenantUrl)
            .where('date', '==', date)
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            return null;
        }
        
        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        };
    } catch (error) {
        console.error('Error reading usage by URL from Firestore:', error);
        throw new Error(`Failed to read usage by URL from Firestore: ${error.message}`);
    }
}

/**
 * Mask PII data in text before storage
 * @param {string} text - Text to mask PII from
 * @returns {string} Text with PII masked
 */
function maskPII(text) {
    if (!text) return text;
    
    let maskedText = text;
    
    // Email addresses
    maskedText = maskedText.replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        '[EMAIL_REDACTED]'
    );
    
    // Phone numbers (various formats)
    maskedText = maskedText.replace(
        /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
        '[PHONE_REDACTED]'
    );
    
    // Credit card numbers (13-19 digits, optionally with spaces or dashes)
    maskedText = maskedText.replace(
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4,7}\b/g,
        '[CARD_REDACTED]'
    );
    
    // SSN (XXX-XX-XXXX)
    maskedText = maskedText.replace(
        /\b\d{3}-\d{2}-\d{4}\b/g,
        '[SSN_REDACTED]'
    );
    
    // IP addresses
    maskedText = maskedText.replace(
        /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        '[IP_REDACTED]'
    );
    
    // API keys and tokens (common patterns)
    maskedText = maskedText.replace(
        /\b[A-Za-z0-9_-]{32,}\b/g,
        (match) => {
            // Only mask if it looks like a token (has mixed case or underscores/dashes)
            if (/[A-Z]/.test(match) && /[a-z]/.test(match) || /[_-]/.test(match)) {
                return '[TOKEN_REDACTED]';
            }
            return match;
        }
    );
    
    return maskedText;
}

/**
 * Log a user prompt to Firestore for analytics (with PII masking)
 * @param {string} tenantUrl - The BigID tenant URL
 * @param {string} tenantId - The tenant identifier (hashed)
 * @param {string} prompt - The user's prompt text
 * @param {string} model - The AI model used
 * @returns {Promise<string>} Document ID of the logged prompt
 */
async function logPrompt(tenantUrl, tenantId, prompt, model) {
    try {
        const firestore = getFirestoreInstance();
        
        // Mask PII before storing
        const maskedPrompt = maskPII(prompt);
        
        const promptData = {
            tenantUrl,
            tenantId,
            prompt: maskedPrompt,
            model,
            timestamp: Firestore.FieldValue.serverTimestamp(),
            date: new Date().toISOString().split('T')[0]
        };
        
        const docRef = await firestore.collection(PROMPTS_COLLECTION).add(promptData);
        
        return docRef.id;
    } catch (error) {
        console.error('Error logging prompt to Firestore:', error);
        // Don't throw error - prompt logging shouldn't break the app
        return null;
    }
}

module.exports = {
    getUsageForEnvironment,
    incrementUsageForEnvironment,
    getUsageHistory,
    getUsageByUrl,
    logPrompt
};
