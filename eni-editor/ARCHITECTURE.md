# ENI-Editor Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENI-Editor System                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Data Layer    │
│                 │    │                 │    │                 │
│ • Next.js UI    │◄──►│ • Express.js    │◄──►│ • SQLite DB     │
│ • React Pages   │    │ • API Routes    │    │ • File System   │
│ • User Interface│    │ • Authentication│    │ • Session Store │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  External       │    │   Security      │    │   Operations    │
│  Systems        │    │   Layer         │    │   Layer         │
│                 │    │                 │    │                 │
│ • ENI Servers   │    │ • AES-256-GCM   │    │ • SSH Operations│
│ • Raspberry Pi  │    │ • TLS/HTTPS     │    │ • File Transfer │
│ • SSH Access    │    │ • Session Mgmt  │    │ • Logging       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Component Details

### Frontend Layer
- **Next.js 15**: React-based web application
- **Pages**: 
  - Main dashboard
  - Configuration management
  - Superuser administration
  - Device management
  - SSH/TLS management

### Backend Layer
- **Express.js Server**: HTTP/HTTPS server with Next.js integration
- **API Routes**: RESTful endpoints for all operations
- **Authentication**: Session-based with role management
- **Middleware**: Request validation, error handling, logging

### Data Layer
- **SQLite Database**: 
  - Users table (authentication)
  - Settings table (system configuration)
  - Devices table (inventory)
  - Config_entries table (configuration data)
  - Ops_logs table (operation history)
- **File System**:
  - Encrypted SSH keys
  - TLS certificates
  - Session store

### Security Layer
- **Encryption**: AES-256-GCM for SSH key protection
- **TLS**: HTTPS with certificate management
- **Authentication**: Role-based access control
- **Session Management**: Secure cookie-based sessions

### Operations Layer
- **SSH Operations**: Secure file transfer using ssh2-sftp-client
- **Configuration Management**: CRUD operations for config entries
- **Logging**: Comprehensive operation logging
- **Error Handling**: Robust error handling and recovery

## Data Flow

### Configuration Retrieval
```
User Request → API → SSH Client → ENI Server → Config File → Parse → Store → Response
```

### Configuration Deployment
```
User Request → API → Generate Config → SSH Client → Raspberry Pi → Deploy → Log → Response
```

### Authentication Flow
```
Login Request → Validate Credentials → Create Session → Set Cookie → Authorize Access
```

## Security Model

### User Roles
- **ENI-USER**: Limited access to user-specific configuration
- **ENI-SUPERUSER**: Full system access and administration

### Access Control
- Session-based authentication
- Role-based authorization
- Secure cookie management
- Input validation and sanitization

### Data Protection
- Encrypted SSH key storage
- TLS for all communications
- SQL injection prevention
- XSS protection

## Deployment Architecture

### Development
```
Developer Machine → Local Server → SQLite Database → File System
```

### Production
```
Load Balancer → Application Server → Database → File Storage → External Systems
```

## Monitoring and Logging

### Operation Logs
- All SSH operations logged
- Error tracking and reporting
- Performance monitoring
- Audit trail for configuration changes

### Health Monitoring
- Health endpoint for system status
- Database connectivity checks
- External system availability
- Certificate expiration monitoring