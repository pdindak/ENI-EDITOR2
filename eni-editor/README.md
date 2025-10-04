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

## 🧭 Installation

### Running tests locally like CI

- Clear caches (optional for a fresh run):
  - npm run clean:cache
- Start the server in CI-like mode (in one terminal):
  - MEMORY_DB=1 SESSION_STORE=memory CONFIG_DB_DISABLED=1 RESET_CONFIG_SCHEMA=1 npm run start
- In a second terminal, run E2E tests:
  - PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run test:e2e
- To view the HTML report locally after a run:
  - npx playwright show-report playwright-report

### Linux (Ubuntu 22.04+/24.04+)

Prerequisites:
- Node.js LTS and npm

Steps:
1) Install Node.js LTS (NodeSource)
   - curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   - sudo apt-get install -y nodejs

2) Clone and install
   - git clone https://github.com/pdindak/ENI-EDITOR.git
   - cd ENI-EDITOR/eni-editor
   - npm install

3) Optional: install Playwright browsers and OS deps (for e2e tests)
   - npm run test:install

4) TLS (optional for HTTPS)
   - Place certificates in ./certs (relative to eni-editor):
     - server.pfx
     - or PEM pair: server.key and server.crt (optional chain.crt)
   - Alternatively set env vars: TLS_PFX_PATH or TLS_KEY_PATH/TLS_CERT_PATH/TLS_CA_PATH

5) Run
   - Development (HTTP :8080): npm run dev:server
   - Production (HTTP :8080, HTTPS :443 if certs present):
     - export NODE_ENV=production
     - export SESSION_SECRET="<strong-random>"
     - export SSH_KEYS_SECRET="<strong-random>"
     - optionally: export DATA_DIR=/var/lib/eni-editor
     - npm run start

### Windows Server 2019/2022

Prerequisites:
- Node.js LTS and npm (install via winget or MSI)
  - winget install OpenJS.NodeJS.LTS
  - or download from https://nodejs.org/en/download

Steps:
1) Clone and install
   - Open PowerShell
   - git clone https://github.com/pdindak/ENI-EDITOR.git
   - cd ENI-EDITOR/eni-editor
   - npm install

2) TLS (optional for HTTPS)
   - Preferred: place a PFX at .\certs\server.pfx
   - Or set environment variables to point to files (PFX or PEM):
     - $env:TLS_PFX_PATH = "C:\\path\\to\\server.pfx"
     - or $env:TLS_KEY_PATH / $env:TLS_CERT_PATH / $env:TLS_CA_PATH

3) Run
   - Development (PowerShell):
     - npm run dev:server
   - Production (PowerShell):
     - $env:NODE_ENV = "production"
     - $env:SESSION_SECRET = "<strong-random>"
     - $env:SSH_KEYS_SECRET = "<strong-random>"
     - $env:DATA_DIR = "C:\\eni-editor\\data"  # optional
     - npm run start

Notes:
- HTTP_PORT and HTTPS_PORT can be overridden via environment variables.
- Data (SQLite DB, sessions, encrypted SSH keys) defaults to ./data unless DATA_DIR is set.
- Health check: GET /healthz returns { status: "ok" } when the server is ready.

## 🛡️ Run as a Background Service

### Linux (systemd)

Sample files:
- scripts/systemd/eni-editor.service
- scripts/systemd/eni-editor.env.example

1) Create a dedicated user (optional but recommended)

```bash path=null start=null
sudo useradd --system --home /opt/eni-editor --shell /usr/sbin/nologin eni-editor || true
sudo mkdir -p /opt/eni-editor
sudo cp -r "$(pwd)" /opt/eni-editor/ENI-EDITOR
sudo chown -R eni-editor:eni-editor /opt/eni-editor
```

2) Create an environment file at /etc/default/eni-editor

```sh path=null start=null
SESSION_SECRET=<strong-random>
SSH_KEYS_SECRET=<strong-random>
NODE_ENV=production
HTTP_PORT=8080
HTTPS_PORT=443
# Where SQLite DB, sessions, and SSH keys live
DATA_DIR=/var/lib/eni-editor
# Optional TLS file overrides (uncomment and set as needed)
# TLS_PFX_PATH=/opt/eni-editor/ENI-EDITOR/eni-editor/certs/server.pfx
# TLS_KEY_PATH=/opt/eni-editor/ENI-EDITOR/eni-editor/certs/server.key
# TLS_CERT_PATH=/opt/eni-editor/ENI-EDITOR/eni-editor/certs/server.crt
# TLS_CA_PATH=/opt/eni-editor/ENI-EDITOR/eni-editor/certs/chain.crt
```

3) Create the systemd unit at /etc/systemd/system/eni-editor.service

```ini path=null start=null
[Unit]
Description=ENI-Editor web service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=eni-editor
WorkingDirectory=/opt/eni-editor/ENI-EDITOR/eni-editor
EnvironmentFile=/etc/default/eni-editor
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=3
# Optional: increase file limit
# LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

4) Enable and start

```bash path=null start=null
sudo systemctl daemon-reload
sudo systemctl enable --now eni-editor
sudo systemctl status eni-editor --no-pager
# Logs
journalctl -u eni-editor -e --no-pager
```

Notes:
- Binding to 443 may require elevated capability. Consider:
  - Use HTTPS_PORT=8443, or
  - Run behind a reverse proxy (nginx, caddy), or
  - Allow node to bind low ports: sudo setcap 'cap_net_bind_service=+ep' "$(command -v node)"

### Windows Server (Service)

Option A: NSSM (Non-Sucking Service Manager)

Sample scripts:
- scripts/windows/Start-EniEditor.ps1
- scripts/windows/Register-EniEditorService.ps1

1) Install NSSM

```powershell path=null start=null
choco install nssm -y
# Or download from https://nssm.cc/download and add nssm.exe to PATH
```

2) Install the service (adjust paths)

```powershell path=null start=null
$n = "ENI-Editor"
$dir = "C:\\path\\to\\ENI-EDITOR\\eni-editor"
$nexe = "C:\\Program Files\\nodejs\\node.exe"

nssm install $n $nexe server.js
nssm set $n AppDirectory $dir
nssm set $n AppEnvironmentExtra "NODE_ENV=production" "SESSION_SECRET=<strong-random>" "SSH_KEYS_SECRET=<strong-random>" "DATA_DIR=C:\\eni-editor\\data"
# Optional TLS env vars:
# nssm set $n AppEnvironmentExtra "TLS_PFX_PATH=C:\\eni-editor\\certs\\server.pfx"

# Optional: redirect logs
nssm set $n AppStdout "C:\\eni-editor\\logs\\out.log"
nssm set $n AppStderr "C:\\eni-editor\\logs\\err.log"

nssm start $n
```

Useful commands

```powershell path=null start=null
nssm status ENI-Editor
nssm stop ENI-Editor
nssm restart ENI-Editor
Get-Content -Path C:\\eni-editor\\logs\\out.log -Wait
```

Option B: Windows Service via wrapper script
- Create a PowerShell script that sets env vars and launches node server.js, then register it with New-Service pointing to powershell.exe -File script.ps1. NSSM is generally simpler and more robust for Node services.

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

Comprehensive documentation is available in multiple formats:

- **[APPLICATION_DOCUMENTATION.md](./APPLICATION_DOCUMENTATION.md)** - Complete technical documentation with API examples, error handling, performance tuning, and backup procedures
- **[USER_GUIDE.md](./USER_GUIDE.md)** - User-friendly guide for ENI-USER and ENI-SUPERUSER roles
- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - General system documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview
- **README.md** - Quick start and overview (this file)

### Enhanced Documentation Features
- ✅ **Complete API Reference** with request/response examples
- ✅ **Detailed Configuration Field Descriptions** with valid values and examples
- ✅ **HTTP Status Code Reference** with error handling guidance
- ✅ **Performance Considerations** and scaling recommendations
- ✅ **Resource Requirements** for different deployment sizes
- ✅ **Comprehensive Error Handling** with troubleshooting guides
- ✅ **Backup & Restore Procedures** with automated scripts

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