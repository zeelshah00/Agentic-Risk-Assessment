# Global Load Balancer with geolocation headers
# Enable by setting enable_load_balancer = true in terraform.tfvars

# Reserve a global static IP address
resource "google_compute_global_address" "default" {
  count = var.enable_load_balancer ? 1 : 0
  name  = "${var.app_name}-lb-ip-dev"
}

# Create a NEG (Network Endpoint Group) for the Cloud Run service
resource "google_compute_region_network_endpoint_group" "cloudrun_neg" {
  count                 = var.enable_load_balancer ? 1 : 0
  name                  = "${var.app_name}-neg-dev"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  
  cloud_run {
    service = google_cloud_run_v2_service.default.name
  }
}

# Backend service
resource "google_compute_backend_service" "default" {
  count                 = var.enable_load_balancer ? 1 : 0
  name                  = "${var.app_name}-backend-dev"
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 30
  enable_cdn            = false
  
  backend {
    group = google_compute_region_network_endpoint_group.cloudrun_neg[0].id
  }
  
  # Add custom headers with geolocation information
  # These predefined variables are automatically available from the Load Balancer
  custom_request_headers = [
    "X-Country-Code: {client_region}",
    "X-Region-Code: {client_region_subdivision}",
    "X-City: {client_city}"
  ]
  
  log_config {
    enable = true
    sample_rate = 1.0
  }
}

# URL map
resource "google_compute_url_map" "default" {
  count           = var.enable_load_balancer ? 1 : 0
  name            = "${var.app_name}-url-map-dev"
  default_service = google_compute_backend_service.default[0].id
}

# HTTP proxy
resource "google_compute_target_http_proxy" "default" {
  count   = var.enable_load_balancer ? 1 : 0
  name    = "${var.app_name}-http-proxy-dev"
  url_map = google_compute_url_map.default[0].id
}

# HTTPS proxy (requires SSL certificate)
resource "google_compute_target_https_proxy" "default" {
  count            = var.enable_load_balancer ? 1 : 0
  name             = "${var.app_name}-https-proxy-dev"
  url_map          = google_compute_url_map.default[0].id
  ssl_certificates = [google_compute_managed_ssl_certificate.default[0].id]
}

# Managed SSL certificate
resource "google_compute_managed_ssl_certificate" "default" {
  count = var.enable_load_balancer ? 1 : 0
  name  = "${var.app_name}-ssl-cert-dev"
  
  managed {
    domains = [var.domain_name]
  }
}

# Global forwarding rule for HTTP (redirect to HTTPS)
resource "google_compute_global_forwarding_rule" "http" {
  count      = var.enable_load_balancer ? 1 : 0
  name       = "${var.app_name}-http-dev"
  target     = google_compute_target_http_proxy.default[0].self_link
  port_range = "80"
  ip_address = google_compute_global_address.default[0].address
  
  lifecycle {
    prevent_destroy = false
    ignore_changes = [
      ip_address,  # Prevent changes to IP address once created
    ]
  }
}

# Global forwarding rule for HTTPS
resource "google_compute_global_forwarding_rule" "https" {
  count      = var.enable_load_balancer ? 1 : 0
  name       = "${var.app_name}-https-dev"
  target     = google_compute_target_https_proxy.default[0].self_link
  port_range = "443"
  ip_address = google_compute_global_address.default[0].address
  
  lifecycle {
    prevent_destroy = false
    ignore_changes = [
      ip_address,  # Prevent changes to IP address once created
    ]
  }
}

# Output the load balancer IP
output "load_balancer_ip" {
  value       = var.enable_load_balancer ? google_compute_global_address.default[0].address : "Load balancer not enabled"
  description = "The IP address of the load balancer - use this for your DNS A record"
}

output "load_balancer_url" {
  value       = var.enable_load_balancer ? "https://${var.domain_name}" : "Load balancer not enabled"
  description = "The URL of the load balancer"
}

output "dns_instructions" {
  value = var.enable_load_balancer ? "Create DNS A record: ${var.domain_name} -> ${google_compute_global_address.default[0].address}" : "Load balancer not enabled"
  description = "DNS configuration instructions"
}
