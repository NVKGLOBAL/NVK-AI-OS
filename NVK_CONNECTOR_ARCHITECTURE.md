# NVK OS — Connector Architecture

## Overview
Connectors provide a strict separation between local execution capabilities and external services (e.g. Email, CRM, Shopify, Social Platforms, Native Apps).

## States
- **CONNECTED**: Fully authenticated and healthy.
- **CONNECTOR_REQUIRED**: External service requires user credentials or integration setup.
- **UNAVAILABLE**: Runtime environment lacks support.
