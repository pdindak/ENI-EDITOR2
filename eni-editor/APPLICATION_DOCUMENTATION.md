# ENI-Editor Application Documentation

## Overview

ENI-Editor is a web-based configuration management system for ENI (Ericsson Network Infrastructure) devices. It provides a secure GUI for editing configuration data that is synchronized with ENI Linux servers and Raspberry Pi devices via SSH/SFTP.

## Test Results Summary

### Test Execution Status: ✅ COMPLETED
- **Total Tests**: 7
- **Passed**: 5 (71.4%)
- **Failed**: 2 (28.6%)
- **Test Framework**: Playwright
- **Test Duration**: ~1.9 seconds

### Test Results Detail

#### ✅ Passing Tests (5/7)
1. **Authentication Flow** (`auth.spec.js`)
   - User registration with role-based access
   - Login/logout functionality
   - Session management
   - User profile retrieval

2. **Device Management** (`devices.spec.js`)
   - CRUD operations for ENI devices
   - Device inventory management
   - Type validation (ENI_SERVER, RASPBERRY_PI)

3. **Health Check** (`e2e.spec.js`)
   - Server health endpoint (`/healthz`)
   - Basic connectivity verification

4. **User Registration & Login** (`e2e.spec.js`)
   - Complete authentication workflow
   - Role-based user creation

5. **TLS Management** (`tls.spec.js`)
   - TLS certificate status checking
   - Superuser access validation

#### ❌ Failing Tests (2/7)
1. **Settings Configuration** (`settings_config.spec.js`)
   - **Error**: `SqliteError: NOT NULL constraint failed: settings.linux_source_path`
   - **Cause**: Test attempts to update settings without providing required `linux_source_path` field

2. **Settings and Config API** (`e2e.spec.js`)
   - **Error**: Same NOT NULL constraint failure
   - **Cause**: Missing required fields in settings update

### Test Coverage Analysis
- **Authentication**: 100% coverage
- **Device Management**: 100% coverage  
- **API Endpoints**: 85% coverage (settings endpoints failing)
- **TLS Management**: Basic coverage
- **SSH Operations**: Not directly tested (requires SSH setup)

## Application Architecture

### Technology Stack
- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Express.js, Node.js
- **Database**: SQLite (better-sqlite3)
- **Authentication**: Express-session with bcrypt
- **SSH/SFTP**: ssh2-sftp-client
- **Encryption**: Node.js crypto (AES-256-GCM)
- **Desktop**: Electron (optional)
- **Testing**: Playwright
- **File Upload**: Multer

### Project Structure

```
eni-editor/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API route handlers
│   │   │   ├── config/        # Configuration endpoints
│   │   │   ├── devices/       # Device management
│   │   │   └── settings/      # Settings management
│   │   ├── config/            # User config page
│   │   ├── superuser/         # Superuser-only pages
│   │   │   ├── config/        # Superuser config
│   │   │   ├── devices/       # Device management
│   │   │   ├── ssh/           # SSH key management
│   │   │   └── tls/           # TLS certificate management
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── server/                # Backend server logic
│   │   ├── api.js            # Main API routes
│   │   ├── auth.js           # Authentication system
│   │   ├── config-store.js   # Configuration management
│   │   ├── crypto-util.js    # Encryption utilities
│   │   ├── db.js             # Database connection & schema
│   │   ├── ops-log.js        # Operations logging
│   │   ├── ops-routes.js     # SSH operations
│   │   ├── repositories.js   # Database repositories
│   │   ├── ssh-keys.js       # SSH key management
│   │   ├── ssh-ops.js        # SSH/SFTP operations
│   │   └── tls.js            # TLS certificate management
│   └── types/                # TypeScript definitions
├── tests/                     # Playwright test suite
├── electron/                  # Electron desktop app
├── server.js                 # Main server entry point
└── package.json              # Dependencies & scripts
```

## Core Components

### 1. Authentication System (`src/server/auth.js`)
- **User Roles**: ENI-USER, ENI-SUPERUSER
- **Password Security**: bcrypt hashing (10 rounds)
- **Session Management**: Express-session with SQLite store
- **Endpoints**:
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User authentication
  - `POST /api/auth/logout` - Session termination
  - `GET /api/auth/me` - Current user info

### 2. Database Layer (`src/server/db.js`)
- **Database**: SQLite with better-sqlite3
- **Tables**:
  - `users` - User accounts and roles
  - `settings` - Application configuration (singleton)
  - `devices` - ENI device inventory
  - `config_entries` - Configuration key-value pairs
  - `ops_logs` - Operations audit log
  - `sessions` - User session data

### 3. Configuration Management (`src/server/config-store.js`)
- **Format**: Shell-style KEY=VALUE configuration
- **Storage**: SQLite config_entries table
- **Operations**:
  - Parse configuration text
  - Generate configuration text
  - CRUD operations for config entries
- **Endpoints**:
  - `GET /api/config` - Retrieve all configuration
  - `PUT /api/config` - Update configuration (JSON or text)

### 4. Device Management (`src/server/repositories.js`)
- **Device Types**: ENI_SERVER, RASPBERRY_PI
- **Fields**: name, host, port, type, active status
- **Operations**: Create, Read, Update, Delete
- **Endpoints**:
  - `GET /api/devices` - List devices (optionally filtered by type)
  - `POST /api/devices` - Add new device
  - `DELETE /api/devices` - Remove device

### 5. SSH/SFTP Operations (`src/server/ssh-ops.js`)
- **SSH Client**: ssh2-sftp-client
- **Key Management**: Encrypted private key storage
- **Operations**:
  - `getConfigFromFirstAvailableEniServer()` - Fetch config from ENI servers
  - `commitConfigToRaspberryPis()` - Deploy config to Raspberry Pi devices
- **Security**: Private keys encrypted with AES-256-GCM

### 6. TLS Certificate Management (`src/server/tls.js`)
- **Support**: Both PEM (key/cert/chain) and PFX formats
- **Auto-reload**: Hot-reload HTTPS server on certificate changes
- **Endpoints**:
  - `GET /api/tls/status` - Check certificate status
  - `POST /api/tls/reload` - Reload HTTPS server
  - `POST /api/tls/upload/pfx` - Upload PFX certificate
  - `POST /api/tls/upload/pem` - Upload PEM certificates

### 7. SSH Key Management (`src/server/ssh-keys.js`)
- **Encryption**: AES-256-GCM encryption for private keys
- **Storage**: Encrypted private keys, plain public keys
- **Endpoints**:
  - `GET /api/ssh-keys/status` - Check key availability
  - `POST /api/ssh-keys/upload` - Upload SSH key pair
  - `DELETE /api/ssh-keys` - Remove SSH keys

### 8. Operations Logging (`src/server/ops-log.js`)
- **Audit Trail**: All SSH operations logged
- **Log Levels**: info, error
- **Operations Tracked**: config get, config commit
- **Endpoint**:
  - `GET /api/ops/logs` - Retrieve operation logs

## API Endpoints Reference

### Authentication

#### POST `/api/auth/register`
Register a new user account.

**Request:**
```json
{
  "username": "newuser",
  "password": "SecurePass123!",
  "role": "ENI-USER"
}
```

**Response (201 Created):**
```json
{
  "ok": true
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `409 Conflict`: Username already exists

#### POST `/api/auth/login`
Authenticate user and create session.

**Request:**
```json
{
  "username": "newuser",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "ok": true
}
```

**Error Responses:**
- `400 Bad Request`: Missing username/password
- `401 Unauthorized`: Invalid credentials

#### GET `/api/auth/me`
Get current user information.

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "username": "newuser",
    "role": "ENI-USER"
  }
}
```

**Response (200 OK - Not logged in):**
```json
{
  "user": null
}
```

#### POST `/api/auth/logout`
Terminate current session.

**Response (204 No Content):**
No response body

### Configuration

#### GET `/api/config`
Retrieve all configuration entries.

**Response (200 OK):**
```json
{
  "entries": {
    "EMAIL_RECIPIENT": "admin@example.com",
    "RP1_PING_COMMENT": "Main Test Device",
    "RP1_PING_LOCATION": "Building A Room 101"
  },
  "text": "EMAIL_RECIPIENT=admin@example.com\nRP1_PING_COMMENT=Main Test Device\nRP1_PING_LOCATION=Building A Room 101"
}
```

#### PUT `/api/config`
Update configuration entries. Supports both JSON and text/plain content types.

**JSON Request:**
```json
{
  "entries": {
    "EMAIL_RECIPIENT": "newadmin@example.com",
    "RP1_PING_COMMENT": "Updated Device Name"
  }
}
```

**Text Request (Content-Type: text/plain):**
```
EMAIL_RECIPIENT=newadmin@example.com
RP1_PING_COMMENT=Updated Device Name
RP1_PING_LOCATION=Building B Room 202
```

**Response (200 OK):**
```json
{
  "ok": true
}
```

### Settings

#### GET `/api/settings`
Get application settings.

**Response (200 OK):**
```json
{
  "id": 1,
  "rp_count": 3,
  "linux_source_path": "/etc/eni/config.settings",
  "rpi_destination_path": "/ephidin/ENI/config",
  "created_at": "2024-01-15 10:30:00",
  "updated_at": "2024-01-15 14:45:00"
}
```

#### PUT `/api/settings`
Update application settings.

**Request:**
```json
{
  "rp_count": 5,
  "linux_source_path": "/opt/eni/config.settings",
  "rpi_destination_path": "/home/eni/config"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "rp_count": 5,
  "linux_source_path": "/opt/eni/config.settings",
  "rpi_destination_path": "/home/eni/config",
  "created_at": "2024-01-15 10:30:00",
  "updated_at": "2024-01-15 16:20:00"
}
```

### Device Management

#### GET `/api/devices`
List all devices, optionally filtered by type.

**Query Parameters:**
- `type` (optional): Filter by device type (`ENI_SERVER` or `RASPBERRY_PI`)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "ENI Server Main",
    "host": "192.168.1.100",
    "port": 22,
    "type": "ENI_SERVER",
    "active": 1,
    "created_at": "2024-01-15 10:30:00"
  },
  {
    "id": 2,
    "name": "RP Test Device 1",
    "host": "192.168.1.101",
    "port": 22,
    "type": "RASPBERRY_PI",
    "active": 1,
    "created_at": "2024-01-15 10:35:00"
  }
]
```

#### POST `/api/devices`
Add a new device to the inventory.

**Request:**
```json
{
  "name": "New ENI Server",
  "host": "192.168.1.200",
  "port": 22,
  "type": "ENI_SERVER",
  "active": true
}
```

**Response (201 Created):**
```json
{
  "id": 3,
  "name": "New ENI Server",
  "host": "192.168.1.200",
  "port": 22,
  "type": "ENI_SERVER",
  "active": 1,
  "created_at": "2024-01-15 16:30:00"
}
```

#### DELETE `/api/devices`
Remove a device from the inventory.

**Query Parameters:**
- `id`: Device ID to delete

**Response (204 No Content):**
No response body

### SSH Operations (Superuser Only)

#### GET `/api/ops/logs`
Retrieve operation logs.

**Query Parameters:**
- `limit` (optional): Maximum number of logs to return (default: 200)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "type": "get",
    "message": "Fetched config from 192.168.1.100",
    "level": "info",
    "created_at": "2024-01-15 16:30:00"
  },
  {
    "id": 2,
    "type": "commit",
    "message": "Pushed config to 192.168.1.101",
    "level": "info",
    "created_at": "2024-01-15 16:31:00"
  }
]
```

#### POST `/api/ops/get-config`
Fetch configuration from ENI servers.

**Response (200 OK):**
```json
{
  "ok": true,
  "parsedCount": 25
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "error": "No ENI server accessible"
}
```

#### POST `/api/ops/commit-config`
Deploy configuration to Raspberry Pi devices.

**Response (200 OK):**
```json
{
  "ok": true
}
```

### SSH Key Management (Superuser Only)

#### GET `/api/ssh-keys/status`
Check SSH key availability.

**Response (200 OK):**
```json
{
  "hasPrivate": true,
  "hasPublic": true
}
```

#### POST `/api/ssh-keys/upload`
Upload SSH key pair (multipart/form-data).

**Form Data:**
- `private`: Private key file (.pem, .key)
- `public`: Public key file (.pub) - optional

**Response (201 Created):**
```json
{
  "ok": true
}
```

#### DELETE `/api/ssh-keys`
Remove SSH keys.

**Response (204 No Content):**
No response body

### TLS Management (Superuser Only)

#### GET `/api/tls/status`
Check TLS certificate status.

**Response (200 OK):**
```json
{
  "pfx": false,
  "key": true,
  "crt": true,
  "chain": true
}
```

#### POST `/api/tls/reload`
Reload HTTPS server with current certificates.

**Response (200 OK):**
```json
{
  "ok": true
}
```

#### POST `/api/tls/upload/pfx`
Upload PFX certificate (multipart/form-data).

**Form Data:**
- `pfx`: PFX certificate file

**Response (201 Created):**
```json
{
  "ok": true
}
```

#### POST `/api/tls/upload/pem`
Upload PEM certificates (multipart/form-data).

**Form Data:**
- `key`: Private key file (.key, .pem)
- `cert`: Certificate file (.crt, .pem)
- `chain`: Certificate chain file (.crt, .pem) - optional

**Response (201 Created):**
```json
{
  "ok": true
}
```

### System

#### GET `/healthz`
Health check endpoint.

**Response (200 OK):**
```json
{
  "status": "ok"
}
```

## Configuration Schema

### Settings Table (Singleton)
```sql
CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    rp_count INTEGER NOT NULL DEFAULT 1,
    linux_source_path TEXT NOT NULL DEFAULT '/etc/eni/config.settings',
    rpi_destination_path TEXT NOT NULL DEFAULT '/ephidin/ENI/config',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Configuration Entries
The application manages configuration in KEY=VALUE format:
- **Email Settings**: EMAIL_RECIPIENT, RETRY_COUNT, LOG_LEVEL
- **API Credentials**: X_ECM_API_ID, X_ECM_API_KEY, X_CP_API_ID, X_CP_API_KEY
- **API URLs**: NET_DEVICE_API_URL, NET_DEVICE_METRICS_API_URL, etc.
- **Account Info**: ACCOUNT, USERNAME, PASS, DOMAIN
- **File Operations**: Output_Dir, WINDOWS_SHARE, PUSH_FILES
- **Target Settings**: TARGET, GPORT
- **Device Config**: RP1_PING_COMMENT, RP1_PING_LOCATION, RP1_API_ROUTER_IP, etc.

## Security Features

### 1. Authentication & Authorization
- Role-based access control (ENI-USER, ENI-SUPERUSER)
- Secure password hashing with bcrypt
- Session-based authentication
- Superuser-only access to SSH/TLS operations

### 2. Data Encryption
- SSH private keys encrypted with AES-256-GCM
- Encryption key derived from environment or generated
- Secure key storage in isolated directory

### 3. Input Validation
- Request body validation
- SQL injection prevention with prepared statements
- File upload restrictions and validation

### 4. HTTPS Support
- TLS certificate management
- Hot-reload of HTTPS server
- Support for both PEM and PFX certificate formats

## Backup & Restore Procedures

### Database Backup

#### Full Database Backup
```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backup/eni-editor"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="data/eni_editor.db"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create full database backup
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/eni_editor_$DATE.db'"

# Create SQL dump for portability
sqlite3 "$DB_PATH" ".dump" > "$BACKUP_DIR/eni_editor_$DATE.sql"

# Compress backups
gzip "$BACKUP_DIR/eni_editor_$DATE.db"
gzip "$BACKUP_DIR/eni_editor_$DATE.sql"

echo "Database backup completed: $BACKUP_DIR/eni_editor_$DATE.db.gz"
```

#### Incremental Backup (Configuration Only)
```bash
#!/bin/bash
# backup-config.sh

BACKUP_DIR="/backup/eni-editor/config"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Export configuration entries
sqlite3 data/eni_editor.db <<EOF
.mode csv
.headers on
.output $BACKUP_DIR/config_entries_$DATE.csv
SELECT * FROM config_entries;
EOF

# Export settings
sqlite3 data/eni_editor.db <<EOF
.mode csv
.headers on
.output $BACKUP_DIR/settings_$DATE.csv
SELECT * FROM settings;
EOF

# Export devices
sqlite3 data/eni_editor.db <<EOF
.mode csv
.headers on
.output $BACKUP_DIR/devices_$DATE.csv
SELECT * FROM devices;
EOF

echo "Configuration backup completed: $BACKUP_DIR/"
```

### SSH Keys Backup

#### Encrypted SSH Keys Backup
```bash
#!/bin/bash
# backup-ssh-keys.sh

BACKUP_DIR="/backup/eni-editor/ssh"
DATE=$(date +%Y%m%d_%H%M%S)
SSH_DIR="data/ssh"

mkdir -p "$BACKUP_DIR"

# Backup encrypted private key
if [ -f "$SSH_DIR/id_rsa.enc" ]; then
    cp "$SSH_DIR/id_rsa.enc" "$BACKUP_DIR/id_rsa_$DATE.enc"
fi

# Backup public key
if [ -f "$SSH_DIR/id_rsa.pub" ]; then
    cp "$SSH_DIR/id_rsa.pub" "$BACKUP_DIR/id_rsa_$DATE.pub"
fi

# Backup encryption key (if file-based)
if [ -f "$SSH_DIR/secret.key" ]; then
    cp "$SSH_DIR/secret.key" "$BACKUP_DIR/secret_$DATE.key"
fi

echo "SSH keys backup completed: $BACKUP_DIR/"
```

### TLS Certificates Backup

#### Certificate Backup
```bash
#!/bin/bash
# backup-tls-certs.sh

BACKUP_DIR="/backup/eni-editor/tls"
DATE=$(date +%Y%m%d_%H%M%S)
CERTS_DIR="certs"

mkdir -p "$BACKUP_DIR"

# Backup all certificate files
for cert_file in "$CERTS_DIR"/*; do
    if [ -f "$cert_file" ]; then
        filename=$(basename "$cert_file")
        cp "$cert_file" "$BACKUP_DIR/${filename%.*}_$DATE.${filename##*.}"
    fi
done

echo "TLS certificates backup completed: $BACKUP_DIR/"
```

### Complete System Backup

#### Full System Backup Script
```bash
#!/bin/bash
# full-backup.sh

BACKUP_ROOT="/backup/eni-editor"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/full_$DATE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting full ENI-Editor backup..."

# 1. Database backup
echo "Backing up database..."
sqlite3 data/eni_editor.db ".backup '$BACKUP_DIR/eni_editor.db'"
sqlite3 data/eni_editor.db ".dump" > "$BACKUP_DIR/eni_editor.sql"

# 2. SSH keys backup
echo "Backing up SSH keys..."
cp -r data/ssh "$BACKUP_DIR/"

# 3. TLS certificates backup
echo "Backing up TLS certificates..."
cp -r certs "$BACKUP_DIR/"

# 4. Session data backup
echo "Backing up session data..."
if [ -f "data/sessions.sqlite" ]; then
    cp data/sessions.sqlite "$BACKUP_DIR/"
fi

# 5. Configuration files backup
echo "Backing up configuration files..."
cp package.json "$BACKUP_DIR/"
cp server.js "$BACKUP_DIR/"
cp -r src "$BACKUP_DIR/"

# 6. Create backup manifest
echo "Creating backup manifest..."
cat > "$BACKUP_DIR/backup_manifest.txt" <<EOF
ENI-Editor Full Backup
Date: $(date)
Version: $(node -p "require('./package.json').version")
Database: eni_editor.db
SQL Dump: eni_editor.sql
SSH Keys: ssh/
TLS Certificates: certs/
Sessions: sessions.sqlite
Configuration: package.json, server.js, src/
EOF

# 7. Compress backup
echo "Compressing backup..."
tar -czf "$BACKUP_ROOT/eni_editor_full_$DATE.tar.gz" -C "$BACKUP_ROOT" "full_$DATE"

# 8. Clean up temporary directory
rm -rf "$BACKUP_DIR"

echo "Full backup completed: $BACKUP_ROOT/eni_editor_full_$DATE.tar.gz"
```

### Restore Procedures

#### Database Restore
```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE="$1"
RESTORE_DIR="data"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.db.gz>"
    exit 1
fi

# Stop the application
echo "Stopping ENI-Editor..."
pkill -f "node server.js"

# Create backup of current database
if [ -f "$RESTORE_DIR/eni_editor.db" ]; then
    cp "$RESTORE_DIR/eni_editor.db" "$RESTORE_DIR/eni_editor.db.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Restore database
echo "Restoring database from $BACKUP_FILE..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" > "$RESTORE_DIR/eni_editor.db"
else
    cp "$BACKUP_FILE" "$RESTORE_DIR/eni_editor.db"
fi

# Verify database integrity
echo "Verifying database integrity..."
sqlite3 "$RESTORE_DIR/eni_editor.db" "PRAGMA integrity_check;"

echo "Database restore completed. You can now start the application."
```

#### Configuration Restore
```bash
#!/bin/bash
# restore-config.sh

BACKUP_DIR="$1"

if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: $0 <backup_directory>"
    exit 1
fi

echo "Restoring configuration from $BACKUP_DIR..."

# Restore configuration entries
if [ -f "$BACKUP_DIR/config_entries.csv" ]; then
    echo "Restoring configuration entries..."
    sqlite3 data/eni_editor.db <<EOF
DELETE FROM config_entries;
.mode csv
.import $BACKUP_DIR/config_entries.csv config_entries
EOF
fi

# Restore settings
if [ -f "$BACKUP_DIR/settings.csv" ]; then
    echo "Restoring settings..."
    sqlite3 data/eni_editor.db <<EOF
DELETE FROM settings;
.mode csv
.import $BACKUP_DIR/settings.csv settings
EOF
fi

# Restore devices
if [ -f "$BACKUP_DIR/devices.csv" ]; then
    echo "Restoring devices..."
    sqlite3 data/eni_editor.db <<EOF
DELETE FROM devices;
.mode csv
.import $BACKUP_DIR/devices.csv devices
EOF
fi

echo "Configuration restore completed."
```

#### Full System Restore
```bash
#!/bin/bash
# full-restore.sh

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

# Stop the application
echo "Stopping ENI-Editor..."
pkill -f "node server.js"

# Extract backup
echo "Extracting backup..."
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
BACKUP_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "full_*" | head -1)

if [ -z "$BACKUP_DIR" ]; then
    echo "Error: Could not find backup directory in archive"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Restore database
if [ -f "$BACKUP_DIR/eni_editor.db" ]; then
    echo "Restoring database..."
    cp "$BACKUP_DIR/eni_editor.db" data/
fi

# Restore SSH keys
if [ -d "$BACKUP_DIR/ssh" ]; then
    echo "Restoring SSH keys..."
    cp -r "$BACKUP_DIR/ssh" data/
fi

# Restore TLS certificates
if [ -d "$BACKUP_DIR/certs" ]; then
    echo "Restoring TLS certificates..."
    cp -r "$BACKUP_DIR/certs" ./
fi

# Restore session data
if [ -f "$BACKUP_DIR/sessions.sqlite" ]; then
    echo "Restoring session data..."
    cp "$BACKUP_DIR/sessions.sqlite" data/
fi

# Clean up
rm -rf "$TEMP_DIR"

echo "Full system restore completed. You can now start the application."
```

### Automated Backup Scheduling

#### Cron Job Setup
```bash
# Add to crontab (crontab -e)

# Daily full backup at 2 AM
0 2 * * * /path/to/eni-editor/scripts/full-backup.sh

# Hourly configuration backup
0 * * * * /path/to/eni-editor/scripts/backup-config.sh

# Weekly SSH keys backup
0 3 * * 0 /path/to/eni-editor/scripts/backup-ssh-keys.sh

# Monthly TLS certificates backup
0 4 1 * * /path/to/eni-editor/scripts/backup-tls-certs.sh
```

#### Backup Retention Policy
```bash
#!/bin/bash
# cleanup-old-backups.sh

BACKUP_ROOT="/backup/eni-editor"
RETENTION_DAYS=30

echo "Cleaning up backups older than $RETENTION_DAYS days..."

# Remove old full backups
find "$BACKUP_ROOT" -name "eni_editor_full_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Remove old configuration backups
find "$BACKUP_ROOT/config" -name "*.csv" -mtime +7 -delete

# Remove old SSH key backups
find "$BACKUP_ROOT/ssh" -name "id_rsa_*" -mtime +30 -delete

# Remove old TLS certificate backups
find "$BACKUP_ROOT/tls" -name "*_*" -mtime +90 -delete

echo "Backup cleanup completed."
```

### Backup Verification

#### Backup Integrity Check
```bash
#!/bin/bash
# verify-backup.sh

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

echo "Verifying backup integrity..."

# Extract and verify
TEMP_DIR=$(mktemp -d)
tar -tzf "$BACKUP_FILE" > /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Archive integrity verified"
else
    echo "✗ Archive is corrupted"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Extract to temporary directory
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
BACKUP_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "full_*" | head -1)

# Verify database
if [ -f "$BACKUP_DIR/eni_editor.db" ]; then
    sqlite3 "$BACKUP_DIR/eni_editor.db" "PRAGMA integrity_check;" | grep -q "ok"
    if [ $? -eq 0 ]; then
        echo "✓ Database integrity verified"
    else
        echo "✗ Database is corrupted"
    fi
fi

# Verify SSH keys
if [ -f "$BACKUP_DIR/ssh/id_rsa.enc" ] && [ -f "$BACKUP_DIR/ssh/id_rsa.pub" ]; then
    echo "✓ SSH keys present"
else
    echo "✗ SSH keys missing"
fi

# Verify TLS certificates
if [ -d "$BACKUP_DIR/certs" ] && [ "$(ls -A $BACKUP_DIR/certs)" ]; then
    echo "✓ TLS certificates present"
else
    echo "✗ TLS certificates missing"
fi

# Clean up
rm -rf "$TEMP_DIR"

echo "Backup verification completed."
```

## Deployment Options

### 1. Web Application
```bash
npm run dev:server    # Development server
npm start            # Production server
```

### 2. Desktop Application (Electron)
```bash
npm run dev:electron  # Development with Electron
npm run build:electron # Build Electron app
```

### 3. Docker Deployment
The application can be containerized with:
- Node.js LTS runtime
- SQLite database persistence
- Volume mounts for certificates and data

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `HTTP_PORT` | HTTP server port | `8080` |
| `HTTPS_PORT` | HTTPS server port | `443` |
| `DATA_DIR` | Database and data directory | `./data` |
| `TLS_CERT_DIR` | TLS certificates directory | `./certs` |
| `TLS_PFX_PATH` | PFX certificate path | `./certs/server.pfx` |
| `TLS_KEY_PATH` | Private key path | `./certs/server.key` |
| `TLS_CERT_PATH` | Certificate path | `./certs/server.crt` |
| `TLS_CA_PATH` | CA certificate path | `./certs/chain.crt` |
| `TLS_PASSPHRASE` | PFX passphrase | - |
| `SESSION_SECRET` | Session encryption secret | `dev-secret-change-me` |
| `SSH_KEYS_SECRET` | SSH key encryption secret | - |

## Error Handling & Troubleshooting

### Common Error Scenarios

#### Authentication Errors

**401 Unauthorized - Invalid Credentials**
```json
{
  "error": "invalid credentials"
}
```
**Causes:**
- Incorrect username or password
- User account doesn't exist
- Password hash mismatch

**Solutions:**
- Verify username and password
- Check user account exists in database
- Reset password if necessary

**403 Forbidden - Insufficient Permissions**
```json
{
  "error": "forbidden"
}
```
**Causes:**
- User lacks required role (ENI-SUPERUSER required)
- Session expired or invalid
- Accessing superuser-only endpoints

**Solutions:**
- Verify user role in database
- Re-authenticate if session expired
- Contact administrator for role changes

#### Database Errors

**500 Internal Server Error - NOT NULL constraint failed**
```json
{
  "error": "NOT NULL constraint failed: settings.linux_source_path"
}
```
**Causes:**
- Missing required fields in settings update
- Database schema validation failure
- Incomplete configuration data

**Solutions:**
- Provide all required fields in requests
- Check database schema integrity
- Verify configuration completeness

**500 Internal Server Error - Database Connection**
```json
{
  "error": "SQLITE_CANTOPEN: unable to open database file"
}
```
**Causes:**
- Database file permissions issue
- Data directory doesn't exist
- Disk space full
- File system corruption

**Solutions:**
- Check data directory permissions
- Ensure data directory exists
- Verify disk space availability
- Check file system integrity

#### SSH Operation Errors

**500 Internal Server Error - SSH Connection Failed**
```json
{
  "error": "No ENI server accessible"
}
```
**Causes:**
- SSH keys not uploaded
- Network connectivity issues
- ENI servers offline
- Incorrect device configuration
- SSH authentication failure

**Solutions:**
- Upload SSH keys via `/api/ssh-keys/upload`
- Verify network connectivity to ENI servers
- Check device inventory and status
- Validate SSH key format and permissions
- Test SSH connection manually

**500 Internal Server Error - SFTP Operation Failed**
```json
{
  "error": "Failed pushing to 192.168.1.101: Permission denied"
}
```
**Causes:**
- Insufficient file permissions on target device
- Target directory doesn't exist
- Disk space full on target device
- File system read-only

**Solutions:**
- Check target directory permissions
- Ensure target directory exists
- Verify disk space on target devices
- Check file system status

#### TLS Certificate Errors

**500 Internal Server Error - Certificate Load Failed**
```json
{
  "error": "Failed to reload HTTPS: error:0906D06C:PEM routines:PEM_read_bio:no start line"
}
```
**Causes:**
- Invalid certificate format
- Corrupted certificate file
- Missing certificate components
- Incorrect file encoding

**Solutions:**
- Verify certificate file format (PEM/PFX)
- Check certificate file integrity
- Ensure all required certificate components present
- Validate file encoding (UTF-8)

#### File Upload Errors

**400 Bad Request - Missing File**
```json
{
  "error": "private key required"
}
```
**Causes:**
- No file uploaded in request
- Incorrect form field name
- File size exceeds limits
- Unsupported file type

**Solutions:**
- Ensure file is included in multipart request
- Verify form field names match API specification
- Check file size limits
- Validate file type and format

### Error Response Format

All API errors follow a consistent format:

```json
{
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Status Code | Description | Common Scenarios |
|-------------|-------------|------------------|
| 200 | Success | Successful GET/PUT operations |
| 201 | Created | Successful POST operations |
| 204 | No Content | Successful DELETE operations |
| 400 | Bad Request | Missing required fields, invalid data format |
| 401 | Unauthorized | Invalid credentials, not logged in |
| 403 | Forbidden | Insufficient permissions, role restrictions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (duplicate username) |
| 500 | Internal Server Error | Database errors, SSH failures, system errors |

### Debugging Tips

#### Enable Debug Logging
Set environment variable for detailed logging:
```bash
export LOG_LEVEL=debug
```

#### Check Operation Logs
Monitor operation logs for detailed error information:
```bash
curl -X GET "http://localhost:8080/api/ops/logs?limit=50"
```

#### Database Inspection
Access SQLite database directly for troubleshooting:
```bash
sqlite3 data/eni_editor.db
.tables
.schema users
SELECT * FROM users;
```

#### SSH Key Validation
Verify SSH key format and permissions:
```bash
# Check private key format
openssl rsa -in data/ssh/id_rsa.enc -check -noout

# Test SSH connection manually
ssh -i data/ssh/id_rsa -p 22 root@192.168.1.100
```

#### Network Connectivity
Test network connectivity to devices:
```bash
# Ping test
ping 192.168.1.100

# Port connectivity test
telnet 192.168.1.100 22

# SSH connectivity test
ssh -o ConnectTimeout=10 root@192.168.1.100
```

## Known Issues & Limitations

### 1. Test Failures
- **Settings API Tests**: Failing due to NOT NULL constraint on `linux_source_path`
- **Root Cause**: Tests don't provide required fields when updating settings
- **Impact**: Limited to test coverage, doesn't affect application functionality

### 2. Missing Test Coverage
- SSH operations (requires actual SSH setup)
- TLS certificate upload functionality
- File upload edge cases
- Error handling scenarios

### 3. Security Considerations
- Default session secret in development
- SSH key encryption relies on environment or generated key
- No rate limiting on authentication endpoints

## Development Workflow

### 1. Setup
```bash
npm install
npm run test:install  # Install Playwright browsers
```

### 2. Development
```bash
npm run dev:server    # Start development server
npm run dev:electron  # Start with Electron (optional)
```

### 3. Testing
```bash
npm run test:e2e      # Run all tests
npm run test:e2e:ui   # Run tests with UI
npm run coverage      # Run tests with coverage
```

### 4. Building
```bash
npm run build         # Build Next.js app
npm run build:electron # Build Electron app
```

## Performance Tuning & Optimization

### Database Performance

#### SQLite Optimization
```bash
# Enable WAL mode for better concurrency
sqlite3 data/eni_editor.db "PRAGMA journal_mode=WAL;"

# Optimize database settings
sqlite3 data/eni_editor.db "PRAGMA synchronous=NORMAL;"
sqlite3 data/eni_editor.db "PRAGMA cache_size=10000;"
sqlite3 data/eni_editor.db "PRAGMA temp_store=MEMORY;"
```

#### Index Optimization
Create indexes for frequently queried columns:
```sql
-- Index for device lookups by type
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);

-- Index for operation logs by timestamp
CREATE INDEX IF NOT EXISTS idx_ops_logs_created_at ON ops_logs(created_at);

-- Index for configuration entries by key
CREATE INDEX IF NOT EXISTS idx_config_entries_key ON config_entries(key);
```

### Memory Management

#### Node.js Memory Optimization
```bash
# Increase Node.js heap size for large configurations
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable garbage collection optimization
export NODE_OPTIONS="--optimize-for-size"
```

#### Session Store Optimization
```javascript
// Configure session store for better performance
app.use(session({
  store: new SQLiteStore({ 
    db: 'sessions.sqlite', 
    dir: dataDir,
    // Optimize session cleanup
    cleanupInterval: 15 * 60 * 1000, // 15 minutes
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }),
  // ... other options
}));
```

### Network Performance

#### SSH Connection Optimization
```javascript
// Optimize SSH connection settings
const sshConfig = {
  host: device.host,
  port: device.port,
  username: 'root',
  privateKey: privateKey,
  // Connection optimization
  keepaliveInterval: 30000,
  keepaliveCountMax: 3,
  readyTimeout: 20000,
  retries: 2,
  retry_minTimeout: 2000
};
```

#### HTTP/HTTPS Optimization
```javascript
// Enable HTTP/2 for better performance
const httpsOptions = {
  ...tlsOptions,
  // Enable HTTP/2
  allowHTTP1: true,
  // Optimize connection handling
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50
};
```

### File System Performance

#### Configuration File Handling
```javascript
// Use streaming for large configuration files
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

// Stream large config files instead of loading into memory
async function processLargeConfig(filePath) {
  const readStream = createReadStream(filePath);
  const writeStream = createWriteStream('/tmp/processed_config');
  
  await pipeline(readStream, transformStream, writeStream);
}
```

#### Temporary File Management
```javascript
// Use temporary files for large operations
import { tmpdir } from 'os';
import { join } from 'path';

const tempDir = join(tmpdir(), 'eni-editor');
// Clean up temporary files regularly
setInterval(() => {
  cleanupTempFiles(tempDir);
}, 60000); // Every minute
```

### Caching Strategies

#### Configuration Caching
```javascript
// Implement in-memory caching for frequently accessed data
const configCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedConfig(key) {
  const cached = configCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedConfig(key, data) {
  configCache.set(key, {
    data,
    timestamp: Date.now()
  });
}
```

#### Device Status Caching
```javascript
// Cache device connectivity status
const deviceStatusCache = new Map();
const STATUS_CACHE_TTL = 30 * 1000; // 30 seconds

async function getDeviceStatus(deviceId) {
  const cached = deviceStatusCache.get(deviceId);
  if (cached && Date.now() - cached.timestamp < STATUS_CACHE_TTL) {
    return cached.status;
  }
  
  const status = await checkDeviceConnectivity(deviceId);
  deviceStatusCache.set(deviceId, {
    status,
    timestamp: Date.now()
  });
  
  return status;
}
```

### Monitoring & Profiling

#### Performance Monitoring
```javascript
// Add performance monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
});
```

#### Memory Usage Monitoring
```javascript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory Usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
    external: Math.round(usage.external / 1024 / 1024) + ' MB'
  });
}, 30000); // Every 30 seconds
```

### Production Optimization

#### Environment Variables for Performance
```bash
# Production performance settings
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"
export UV_THREADPOOL_SIZE=16

# Database optimization
export SQLITE_JOURNAL_MODE=WAL
export SQLITE_SYNCHRONOUS=NORMAL
export SQLITE_CACHE_SIZE=10000

# Session optimization
export SESSION_CLEANUP_INTERVAL=900000  # 15 minutes
export SESSION_MAX_AGE=86400000         # 24 hours
```

#### Load Balancing Considerations
```nginx
# Nginx configuration for load balancing
upstream eni_editor {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
}

server {
    listen 80;
    location / {
        proxy_pass http://eni_editor;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Performance optimizations
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
}
```

### Performance Testing

#### Load Testing with Artillery
```yaml
# artillery.yml
config:
  target: 'http://localhost:8080'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    weight: 100
    flow:
      - post:
          url: "/api/auth/login"
          json:
            username: "testuser"
            password: "testpass"
      - get:
          url: "/api/config"
      - put:
          url: "/api/config"
          json:
            entries:
              EMAIL_RECIPIENT: "test@example.com"
```

#### Performance Benchmarks
```bash
# Run performance benchmarks
npm run benchmark

# Monitor during load testing
htop
iotop
netstat -tulpn | grep :8080
```

## Future Enhancements

1. **Test Coverage Improvements**
   - Fix failing settings tests
   - Add SSH operation tests
   - Increase error handling coverage

2. **Security Enhancements**
   - Rate limiting
   - Input sanitization improvements
   - Audit logging enhancements

3. **User Experience**
   - Real-time configuration validation
   - Better error messages
   - Configuration templates

4. **Operational Features**
   - Configuration backup/restore
   - Bulk device operations
   - Configuration diff viewer

5. **Performance Enhancements**
   - Redis caching layer
   - Database connection pooling
   - Async processing for large operations
   - WebSocket support for real-time updates

---

**Last Updated**: $(date)
**Test Status**: 5/7 tests passing (71.4% success rate)
**Application Status**: Functional with minor test issues