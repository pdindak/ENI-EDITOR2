# ENI-Editor

A web-based configuration management system for ENI (Ericsson Network Intelligence) devices.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev:server

# Run tests
npm run test:e2e
```

## 📋 Features

- **Role-based Access Control**: ENI-USER and ENI-SUPERUSER roles
- **Configuration Management**: Web-based editor for ENI device configurations
- **SSH Operations**: Secure file transfer between ENI servers and Raspberry Pi devices
- **TLS Support**: HTTPS with certificate management
- **Device Management**: Inventory management for ENI servers and Raspberry Pi devices
- **Real-time Logging**: Operation logs and monitoring
- **Secure Storage**: Encrypted SSH key storage

## 🏗️ Architecture

- **Frontend**: Next.js 15 + React 18
- **Backend**: Node.js + Express.js
- **Database**: SQLite with better-sqlite3
- **Authentication**: Session-based with bcrypt
- **SSH**: ssh2-sftp-client for secure transfers
- **Encryption**: AES-256-GCM for key storage
- **Testing**: Playwright end-to-end tests

## 🔧 Configuration

The system manages configuration files in a hierarchical structure:

### Global Settings
- Number of Raspberry Pi devices
- Source and destination file paths
- System-wide parameters

### Configuration Categories
- **SUPERUSER**: API credentials, network settings, global parameters
- **USER**: Device-specific ping and bandwidth test configurations
- **RP**: Raspberry Pi device-specific settings

## 🧪 Testing

All tests are passing! ✅

```bash
# Run all tests
npm run test:e2e

# Run with coverage
npm run coverage

# List available tests
npx playwright test --config=playwright.config.cjs --list
```

### Test Coverage
- ✅ Authentication (register, login, logout, session management)
- ✅ Device Management (CRUD operations)
- ✅ Configuration Management (settings, config entries)
- ✅ TLS Management (certificate status)
- ✅ End-to-End Workflows (health, auth, config operations)

## 🔐 Security

- **Authentication**: Role-based access with secure sessions
- **Encryption**: AES-256-GCM for SSH key storage
- **TLS**: Full HTTPS support with certificate management
- **Input Validation**: Comprehensive validation and sanitization
- **SQL Injection Prevention**: Prepared statements throughout

## 📁 Project Structure

```
eni-editor/
├── src/
│   ├── app/           # Next.js frontend
│   └── server/        # Express.js backend
├── tests/             # Playwright tests
├── data/              # Runtime data (SQLite, sessions)
├── certs/             # TLS certificates
└── server.js          # Main server entry point
```

## 🚀 Deployment

### Environment Variables
- `NODE_ENV`: Environment mode
- `HTTP_PORT`: HTTP port (default: 8080)
- `HTTPS_PORT`: HTTPS port (default: 443)
- `DATA_DIR`: Data directory path
- `SESSION_SECRET`: Session encryption secret
- `SSH_KEYS_SECRET`: SSH key encryption secret

### Production Setup
1. Set `NODE_ENV=production`
2. Configure TLS certificates
3. Set secure secrets
4. Configure firewall rules

## 📖 Documentation

Comprehensive documentation is available:

- **[APPLICATION_DOCUMENTATION.md](./APPLICATION_DOCUMENTATION.md)** - Complete technical documentation with API examples, error handling, performance tuning, and backup procedures
- **[USER_GUIDE.md](./USER_GUIDE.md)** - User-friendly guide for ENI-USER and ENI-SUPERUSER roles
- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - General system documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview

## 🔄 Workflow

1. **Setup**: Create superuser, upload SSH keys, add devices
2. **Get Config**: Fetch configuration from ENI servers
3. **Edit**: Modify settings through web interface
4. **Save**: Store changes locally
5. **Commit**: Deploy to Raspberry Pi devices

## 🛠️ Development

```bash
# Development server
npm run dev:server

# With Electron
npm run dev:electron

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user info

### Configuration
- `GET /api/config` - Get configuration
- `PUT /api/config` - Update configuration
- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update system settings

### Operations (Superuser)
- `POST /api/ops/get-config` - Fetch from ENI servers
- `POST /api/ops/commit-config` - Deploy to Raspberry Pi
- `GET /api/ops/logs` - Operation logs

## 🐛 Troubleshooting

### Common Issues
- **Database**: Check data directory permissions
- **SSH**: Verify keys and network connectivity
- **TLS**: Check certificate paths and validity
- **Auth**: Clear browser cookies if needed

### Logs
- Server logs: Console output
- Operation logs: `/api/ops/logs`
- Database: `data/eni_editor.db`

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Use TypeScript for type safety

## 📞 Support

- Check troubleshooting section
- Review test files for examples
- Check GitHub issues and discussions

---

**Status**: ✅ All tests passing | 🔒 Security hardened | 📚 Fully documented