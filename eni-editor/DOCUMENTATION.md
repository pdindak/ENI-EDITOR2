# ENI-Editor Documentation

## Overview

ENI-Editor is a web-based configuration management system for ENI (Ericsson Network Intelligence) devices. It provides a secure, user-friendly interface for managing configuration files that are distributed across ENI Linux servers and Raspberry Pi devices.

## Architecture

### Technology Stack
- **Frontend**: Next.js 15 with React 18
- **Backend**: Node.js with Express.js
- **Database**: SQLite with better-sqlite3
- **Authentication**: Session-based with bcrypt password hashing
- **SSH Operations**: ssh2-sftp-client for secure file transfers
- **Encryption**: AES-256-GCM for SSH key storage
- **Testing**: Playwright for end-to-end testing

### Key Components

#### 1. Server Architecture (`server.js`)
- Express.js server with Next.js integration
- HTTP (port 8080) and HTTPS (port 443) support
- TLS certificate management with hot-reload
- Session management with SQLite store
- Modular route mounting for different functionalities

#### 2. Database Layer (`src/server/db.js`)
- SQLite database with automatic schema creation
- Tables: `users`, `settings`, `devices`, `config_entries`, `ops_logs`
- Connection management and bootstrap functionality

#### 3. Authentication System (`src/server/auth.js`)
- Role-based access control (ENI-USER, ENI-SUPERUSER)
- Session management with secure cookies
- Password hashing with bcrypt
- User registration and login endpoints

#### 4. Configuration Management (`src/server/config-store.js`)
- Key-value configuration storage
- Text parsing for shell-like KEY=VALUE format
- CRUD operations for configuration entries
- Transaction-based updates

#### 5. SSH Operations (`src/server/ssh-ops.js`)
- Secure file transfer using SSH2-SFTP
- Configuration retrieval from ENI servers
- Configuration deployment to Raspberry Pi devices
- Error handling and logging

#### 6. Security Features (`src/server/crypto-util.js`)
- AES-256-GCM encryption for SSH keys
- Environment-based or file-based encryption keys
- Secure key storage and retrieval

## User Roles

### ENI-USER
- Access to user-specific configuration fields
- Can edit USER role configuration entries
- Limited to ping and bandwidth test configurations

### ENI-SUPERUSER
- Full system access
- SSH key management
- TLS certificate management
- Device management
- Configuration operations (get/commit)
- Access to all configuration fields

## Configuration Structure

The system manages configuration in a hierarchical structure:

### Global Settings
- `rp_count`: Number of Raspberry Pi devices
- `linux_source_path`: Path to config file on ENI servers
- `rpi_destination_path`: Path to config file on Raspberry Pi devices

### Configuration Categories

#### SUPERUSER Configuration
- Email and logging settings
- API credentials and endpoints
- Network and file sharing settings
- Global test parameters

#### USER Configuration
- Device-specific ping comments and locations
- Bandwidth test comments and locations
- User-customizable test parameters

#### RP (Raspberry Pi) Configuration
- Device-specific network settings
- API router configurations
- Test argument configurations
- Device identification parameters

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Settings Management
- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update system settings

### Device Management
- `GET /api/devices` - List all devices
- `POST /api/devices` - Add new device
- `DELETE /api/devices` - Remove device

### Configuration Management
- `GET /api/config` - Get all configuration entries
- `PUT /api/config` - Update configuration entries (JSON or text/plain)

### Operations (Superuser Only)
- `GET /api/ops/logs` - Get operation logs
- `POST /api/ops/get-config` - Fetch config from ENI servers
- `POST /api/ops/commit-config` - Deploy config to Raspberry Pi devices

### TLS Management (Superuser Only)
- `GET /api/tls/status` - Get TLS certificate status
- `POST /api/tls/reload` - Reload TLS certificates
- `POST /api/tls/upload/pfx` - Upload PFX certificate
- `POST /api/tls/upload/pem` - Upload PEM certificates

### SSH Key Management (Superuser Only)
- `GET /api/ssh-keys/status` - Get SSH key status
- `POST /api/ssh-keys/upload` - Upload SSH keys
- `DELETE /api/ssh-keys` - Remove SSH keys

## Frontend Pages

### Main Page (`/`)
- Basic application information
- Health status display

### Configuration Page (`/config`)
- SSH operations interface
- Get/commit configuration buttons
- Operation logs display

### Superuser Pages (`/superuser/`)
- **Config** (`/superuser/config`): Full configuration management
- **Devices** (`/superuser/devices`): Device inventory management
- **SSH** (`/superuser/ssh`): SSH key management
- **TLS** (`/superuser/tls`): TLS certificate management

## Testing

### Test Coverage
The application includes comprehensive end-to-end tests covering:

1. **Authentication Tests** (`tests/auth.spec.js`)
   - User registration and login
   - Session management
   - Logout functionality

2. **Device Management Tests** (`tests/devices.spec.js`)
   - CRUD operations for devices
   - Device type validation

3. **Configuration Tests** (`tests/settings_config.spec.js`)
   - Settings updates
   - Configuration roundtrip testing

4. **TLS Tests** (`tests/tls.spec.js`)
   - TLS status access
   - Superuser authentication

5. **End-to-End Tests** (`tests/e2e.spec.js`)
   - Health endpoint
   - Authentication flow
   - Settings and configuration API

### Running Tests
```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run test:install

# Run tests
npm run test:e2e

# Run tests with coverage
npm run coverage
```

## Security Features

### Authentication & Authorization
- Role-based access control
- Secure session management
- Password hashing with bcrypt
- HTTP-only cookies

### Data Protection
- SSH keys encrypted with AES-256-GCM
- TLS support for HTTPS communication
- Input validation and sanitization
- SQL injection prevention with prepared statements

### Network Security
- SSH key-based authentication for file transfers
- Encrypted communication channels
- Secure file upload handling

## Deployment

### Environment Variables
- `NODE_ENV`: Environment mode (development/production)
- `HTTP_PORT`: HTTP server port (default: 8080)
- `HTTPS_PORT`: HTTPS server port (default: 443)
- `DATA_DIR`: Data directory path
- `TLS_CERT_DIR`: TLS certificates directory
- `TLS_PFX_PATH`: PFX certificate file path
- `TLS_KEY_PATH`: Private key file path
- `TLS_CERT_PATH`: Certificate file path
- `TLS_CA_PATH`: Certificate authority file path
- `TLS_PASSPHRASE`: Certificate passphrase
- `SESSION_SECRET`: Session encryption secret
- `SSH_KEYS_SECRET`: SSH key encryption secret

### Production Setup
1. Set `NODE_ENV=production`
2. Configure TLS certificates
3. Set secure session secret
4. Configure SSH key encryption secret
5. Set up proper firewall rules
6. Configure reverse proxy if needed

### Development Setup
```bash
# Clone repository
git clone https://github.com/pdindak/ENI-EDITOR.git
cd ENI-EDITOR

# Install dependencies
npm install

# Start development server
npm run dev:server

# Start with Electron (optional)
npm run dev:electron
```

## File Structure

```
eni-editor/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   ├── config/            # Configuration page
│   │   ├── superuser/         # Superuser pages
│   │   └── layout.tsx         # Root layout
│   ├── server/                # Backend server code
│   │   ├── auth.js            # Authentication
│   │   ├── api.js             # API routes
│   │   ├── config-store.js    # Configuration management
│   │   ├── crypto-util.js     # Encryption utilities
│   │   ├── db.js              # Database management
│   │   ├── ops-log.js         # Operation logging
│   │   ├── ops-routes.js      # Operations routes
│   │   ├── repositories.js    # Data access layer
│   │   ├── ssh-keys.js        # SSH key management
│   │   ├── ssh-ops.js         # SSH operations
│   │   └── tls.js             # TLS management
│   └── types/                 # TypeScript definitions
├── tests/                     # Test files
├── data/                      # Runtime data (database, sessions)
├── certs/                     # TLS certificates
├── server.js                  # Main server file
├── package.json               # Dependencies and scripts
└── playwright.config.cjs      # Test configuration
```

## Configuration Workflow

### Initial Setup
1. Create superuser account
2. Upload SSH keys for ENI servers and Raspberry Pi devices
3. Configure TLS certificates (optional)
4. Add ENI servers and Raspberry Pi devices to inventory

### Configuration Management
1. **Get Configuration**: Fetch current config from ENI servers
2. **Edit Configuration**: Modify settings through web interface
3. **Save Configuration**: Store changes locally
4. **Commit Configuration**: Deploy changes to Raspberry Pi devices

### Monitoring
- Operation logs track all SSH operations
- Error handling with detailed logging
- Health endpoint for monitoring

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check data directory permissions
   - Verify SQLite installation

2. **SSH Connection Failures**
   - Verify SSH keys are uploaded
   - Check network connectivity
   - Validate device credentials

3. **TLS Certificate Issues**
   - Verify certificate file paths
   - Check certificate validity
   - Ensure proper file permissions

4. **Authentication Problems**
   - Check session configuration
   - Verify user roles
   - Clear browser cookies if needed

### Logs and Debugging
- Server logs: Check console output
- Operation logs: Available via `/api/ops/logs`
- Database: Located in `data/eni_editor.db`
- Sessions: Located in `data/sessions.sqlite`

## Contributing

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Use TypeScript for type safety
- Follow security best practices

### Code Standards
- Use 2-space indentation
- Prefer const/let over var
- Use strict equality (===)
- Implement proper error handling
- Add JSDoc comments for functions

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Support

For support and questions:
- Check the troubleshooting section
- Review the test files for usage examples
- Examine the API endpoints documentation
- Check the GitHub repository for issues and discussions