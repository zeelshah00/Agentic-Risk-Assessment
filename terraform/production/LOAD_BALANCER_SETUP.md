# Load Balancer Setup for Geolocation Headers

This guide explains how to enable the Global Load Balancer with Cloud Armor to automatically add geolocation headers to requests, enabling automatic GDPR compliance for EU users.

## Why Use a Load Balancer?

Cloud Run doesn't provide geolocation headers by default. By placing your Cloud Run service behind a Global Load Balancer with Cloud Armor, you get:

1. **Automatic Geolocation Headers** - `X-Country-Code` header added to every request
2. **DDoS Protection** - Cloud Armor provides Layer 7 protection
3. **SSL Termination** - Managed SSL certificates
4. **Global CDN** - Optional CDN for static assets
5. **GDPR Compliance** - Automatic opt-out for EU users

## Setup Instructions

### 1. Configure Variables

Edit `terraform/production/terraform.tfvars`:

```hcl
# Enable the load balancer
enable_load_balancer = true

# Set your custom domain (required for SSL)
domain_name = "your-app.yourdomain.com"
```

### 2. Apply Terraform First

```bash
cd terraform/production
terraform init
terraform apply
```

Terraform will create the load balancer and reserve a static IP address. At the end, you'll see output like:

```
Outputs:

load_balancer_ip = "34.120.45.67"
dns_instructions = "Create DNS A record: your-app.yourdomain.com -> 34.120.45.67"
```

**Copy this IP address** - you'll need it for DNS configuration.

### 3. Configure DNS

Now create an A record in your DNS provider (e.g., Cloudflare, Route 53, Google Domains):

1. Log into your DNS provider
2. Navigate to DNS settings for your domain
3. Create a new A record:
   - **Name**: `your-app` (the subdomain you chose)
   - **Type**: `A`
   - **Value**: `34.120.45.67` (the IP from terraform output)
   - **TTL**: `300` (5 minutes) or Auto
   - **Proxy Status**: Disabled (if using Cloudflare)
4. Save the record

**Example for different DNS providers:**

**Google Cloud DNS:**
```bash
gcloud dns record-sets create your-app.yourdomain.com. \
  --zone=your-dns-zone \
  --type=A \
  --ttl=300 \
  --rrdatas=34.120.45.67
```

**Cloudflare:**
- Go to DNS tab
- Click "Add record"
- Type: A
- Name: your-app
- IPv4 address: 34.120.45.67
- Proxy status: DNS only (gray cloud)
- TTL: Auto

**Route 53:**
- Go to Hosted zones
- Select your domain
- Create record
- Record name: your-app
- Record type: A
- Value: 34.120.45.67
- TTL: 300

### 4. Wait for SSL Certificate

The managed SSL certificate takes 15-60 minutes to provision. You can check status:

```bash
gcloud compute ssl-certificates describe bigid-agentic-app-ssl-cert \
  --global \
  --format="get(managed.status)"
```

Status should be `ACTIVE` when ready.

### 5. Update Cloud Run Service

The load balancer will be configured to route traffic to your Cloud Run service. No code changes needed!

## How It Works

### Geolocation Headers

Cloud Armor automatically adds these headers to every request:

```
X-Country-Code: US    # ISO 3166-1 alpha-2 country code
X-Region-Code: CA     # Region/state code (if available)
X-City: San Francisco # City name (if available)
```

Your application reads `X-Country-Code` to determine if the user is from the EU and automatically opts them out of analytics for GDPR compliance.

### EU Countries Detected

The system automatically detects these EU countries:
- Austria (AT), Belgium (BE), Bulgaria (BG), Croatia (HR)
- Cyprus (CY), Czech Republic (CZ), Denmark (DK), Estonia (EE)
- Finland (FI), France (FR), Germany (DE), Greece (GR)
- Hungary (HU), Ireland (IE), Italy (IT), Latvia (LV)
- Lithuania (LT), Luxembourg (LU), Malta (MT), Netherlands (NL)
- Poland (PL), Portugal (PT), Romania (RO), Slovakia (SK)
- Slovenia (SI), Spain (ES), Sweden (SE)

## Cost Considerations

The load balancer adds these costs:

- **Forwarding Rules**: ~$18/month (one for HTTP, one for HTTPS)
- **Load Balancer**: ~$18/month base fee
- **Data Processing**: $0.008-0.012 per GB
- **Cloud Armor**: $0.75 per policy/month + $0.50 per million requests

**Estimated total**: ~$50-70/month for typical usage

## Verification

After setup, verify geolocation is working:

1. Navigate to **Settings** tab in the app
2. Scroll to "Location & Analytics Settings"
3. Check that "Detected Country" shows your country code
4. EU users should see "Auto Opt-Out (GDPR): Enabled"

## Troubleshooting

### SSL Certificate Stuck in "PROVISIONING"

- Verify DNS A record points to load balancer IP
- Wait 15-60 minutes for certificate provisioning
- Check certificate status with gcloud command above

### Country Shows "Unknown"

- Verify load balancer is receiving traffic (check Cloud Logging)
- Ensure Cloud Armor policy is attached to backend service
- Check that `X-Country-Code` header is present in request logs

### Traffic Not Routing to Cloud Run

- Verify Cloud Run service name matches in NEG configuration
- Check Cloud Run service is public (allows unauthenticated)
- Review load balancer backend health status

## Disable Load Balancer

To disable and use direct Cloud Run access:

1. Set `enable_load_balancer = false` in terraform.tfvars
2. Run `terraform apply`
3. Access app via Cloud Run URL

**Note**: Without load balancer, geolocation detection won't work and all users will need to manually opt out of analytics if desired.

## Alternative: IP-Based Geolocation

If you don't want to use a load balancer, you can use IP-based geolocation services:

- **ipapi.co** (free tier: 1000 requests/day)
- **ipgeolocation.io** (free tier: 1000 requests/day)  
- **MaxMind GeoLite2** (free, requires local database)

See `server/routes.js` for IP-based implementation (currently commented out).
