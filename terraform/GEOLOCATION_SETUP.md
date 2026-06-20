# Geolocation Setup for GDPR Compliance

This guide explains how to enable automatic geolocation detection for EU users to comply with GDPR regulations.

## The Problem

Cloud Run doesn't provide geolocation headers by default. Without knowing where users are located, we can't automatically opt out EU users from analytics as required by GDPR.

## The Solution

Place your Cloud Run service behind a **Global Load Balancer with Cloud Armor**, which automatically adds geolocation headers to all requests.

## Quick Start

### Option 1: Enable Load Balancer (Recommended for Production)

**Provides:**
- ✅ Automatic `X-Country-Code` header on all requests
- ✅ GDPR compliance (auto opt-out EU users)
- ✅ DDoS protection via Cloud Armor
- ✅ Managed SSL certificates
- ✅ Custom domain support

**Cost:** ~$50-70/month

**Setup Steps:**

1. **Configure Terraform** - Edit `terraform/production/terraform.tfvars`:
```hcl
enable_load_balancer = true
domain_name = "app.yourdomain.com"  # Your custom domain
```

2. **Apply Terraform** - This creates the load balancer and reserves an IP:
```bash
cd terraform/production
terraform apply
```

3. **Note the IP Address** - Terraform will output:
```
load_balancer_ip = "34.120.45.67"
dns_instructions = "Create DNS A record: app.yourdomain.com -> 34.120.45.67"
```

4. **Configure DNS** - In your DNS provider, create an A record:
   - Name: `app` (or your subdomain)
   - Type: `A` 
   - Value: `34.120.45.67` (from terraform output)
   - TTL: `300`

5. **Wait for SSL** - Takes 15-60 minutes. Check status:
```bash
gcloud compute ssl-certificates list --global
```

6. **Access Your App** - Visit `https://app.yourdomain.com`

### Option 2: Without Load Balancer (Default)

**What happens:**
- ❌ No automatic country detection
- ❌ No automatic EU opt-out
- ✅ Users can still manually opt out via footer checkbox
- ✅ No additional cost
- ✅ Simpler setup

**This is the default configuration** - no changes needed.

## Verification

After setting up the load balancer:

1. Access your app via the custom domain
2. Go to **Settings** tab
3. Scroll to "Location & Analytics Settings"
4. Verify:
   - **Detected Country** shows your 2-letter country code (e.g., "US", "FR")
   - **EU Region** shows "Yes" or "No"
   - **Auto Opt-Out** is "Enabled" for EU users

## How Cloud Armor Provides Geolocation

When requests pass through the Global Load Balancer with Cloud Armor:

1. **Client connects** to load balancer IP
2. **Cloud Armor inspects** the client's source IP
3. **Geolocation lookup** determines country from IP
4. **Headers added** to request before forwarding to Cloud Run:
   ```
   X-Country-Code: FR
   X-Region-Code: IDF
   X-City: Paris
   ```
5. **Cloud Run receives** request with geolocation headers
6. **Your app reads** `X-Country-Code` header
7. **EU users** are automatically opted out

## Dev vs Production

Both environments support the load balancer:

**Dev Environment:**
```bash
cd terraform/dev
# Edit terraform.tfvars:
# enable_load_balancer = true
# domain_name = "app-dev.yourdomain.com"
terraform apply
```

**Production Environment:**
```bash
cd terraform/production
# Edit terraform.tfvars:
# enable_load_balancer = true  
# domain_name = "app.yourdomain.com"
terraform apply
```

Resource names are automatically suffixed with `-dev` or `-prod` to avoid conflicts.

## Troubleshooting

### Country Shows "Unknown" in Settings

**Possible causes:**
1. Load balancer not enabled (`enable_load_balancer = false`)
2. Accessing via Cloud Run URL instead of custom domain
3. DNS not pointed to load balancer IP
4. SSL certificate not provisioned yet

**Solution:**
- Enable load balancer in terraform.tfvars
- Access via custom domain (e.g., https://app.yourdomain.com)
- Verify DNS A record points to load balancer IP
- Wait for SSL certificate to be ACTIVE

### SSL Certificate Stuck in PROVISIONING

**Causes:**
- DNS not configured correctly
- DNS propagation not complete
- Domain verification failed

**Solution:**
```bash
# Check DNS record
nslookup app.yourdomain.com

# Check certificate status
gcloud compute ssl-certificates describe bigid-agentic-app-ssl-cert-prod --global

# View certificate details
gcloud compute ssl-certificates describe bigid-agentic-app-ssl-cert-prod \
  --global \
  --format="get(managed.status,managed.domainStatus)"
```

### Headers Not Being Added

**Check:**
1. Accessing via load balancer (not Cloud Run URL)
2. Cloud Armor policy attached to backend service
3. Request logs show geolocation headers

**Verify headers:**
```bash
# Test from command line
curl -I https://app.yourdomain.com/api/config

# Check backend service
gcloud compute backend-services describe bigid-agentic-app-backend-prod --global
```

## Cost Comparison

### Without Load Balancer (Default)
- Cloud Run: ~$10-30/month
- **Total: ~$10-30/month**
- No automatic geolocation

### With Load Balancer
- Cloud Run: ~$10-30/month
- Load Balancer: ~$36/month
- Data Processing: ~$5-10/month
- Cloud Armor: ~$2-5/month
- **Total: ~$53-81/month**
- ✅ Automatic geolocation & GDPR compliance

## When to Use Load Balancer

**Use load balancer when:**
- Operating in production with EU users
- GDPR compliance is required
- Want DDoS protection
- Need custom domain with SSL
- Worth ~$50/month for compliance & security

**Skip load balancer when:**
- Only for development/testing
- No EU users
- Manual opt-out acceptable
- Cost-sensitive deployment
- Using Cloud Run URL directly

## Additional Resources

- [Cloud Armor Documentation](https://cloud.google.com/armor/docs)
- [Load Balancer for Cloud Run](https://cloud.google.com/load-balancing/docs/https/setting-up-https-serverless)
- [Managed SSL Certificates](https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs)
- Detailed setup: `terraform/production/LOAD_BALANCER_SETUP.md`
