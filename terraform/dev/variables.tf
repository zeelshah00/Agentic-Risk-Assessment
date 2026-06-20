variable "gcp_project_id" {
  description = "The GCP project ID to deploy the service to."
  type        = string
  default     = "bigid-labs"
}

variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
  default     = "bigid-agentic-app"
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "stdio_safe_hostnames" {
  description = "Comma-separated list of safe hostnames that are allowed to use STDIO MCP servers. Supports wildcards (e.g., *.aws.env.fyi)"
  type        = string
  default     = "*.aws.env.fyi"
}

variable "daily_token_limit" {
  description = "Daily token limit for AI API usage. Set to 0 for unlimited usage."
  type        = number
  default     = 10000
}

variable "environment_name" {
  description = "Environment identifier for usage tracking"
  type        = string
  default     = "development"
}

variable "domain_name" {
  description = "Custom domain name for the load balancer (e.g., app-dev.example.com). Required for SSL certificate."
  type        = string
  default     = ""
}

variable "enable_load_balancer" {
  description = "Enable Global Load Balancer with Cloud Armor for geolocation headers"
  type        = bool
  default     = false
}
