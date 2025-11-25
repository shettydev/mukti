# Mukti Architecture

## Overview

Mukti follows a modern cloud-native architecture built on NestJS, designed for scalability and performance.

<p align="center">
  <img src="mukti-docs/images/mukti-architecture.png" alt="Mukti Architecture" width="800" />
</p>

## Architecture Layers

### Client Layer

Web and mobile applications serve as entry points for end users, providing responsive interfaces across platforms.

### CDN Layer

CloudFlare CDN handles content delivery, caching static assets and reducing latency globally.

### Backend Core

NestJS powers the core API layer, orchestrating business logic and request handling.

### External Services

MongoDB serves as the primary operational database, and authentication is handled directly within NestJS (JWT + refresh tokens backed by MongoDB user records).

### Application Layer

The main application logic runs on NestJS deployed within Kubernetes clusters, ensuring high availability and horizontal scaling.

### Infrastructure Services

- **MongoDB**: Primary document database for persistent data storage
- **Redis**: In-memory cache for session management and performance optimization
- **Object Storage (S3)**: Handles file uploads and media storage

### Third-Party Integrations

- **Payment Gateway**: Processes transactions and payment operations
- **Email Service**: Manages transactional and notification emails

## Data Flow

Requests flow from clients through the CDN into the NestJS core, which performs authentication itself and coordinates with MongoDB for persistence, Redis for caching, and the Kubernetes-deployed application layer. External integrations handle specialized operations like payments and email delivery.
