# ENI-Editor User Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [ENI-USER Guide](#eni-user-guide)
4. [ENI-SUPERUSER Guide](#eni-superuser-guide)
5. [Troubleshooting](#troubleshooting)
6. [FAQ](#faq)

---

## Overview

ENI-Editor is a web-based configuration management system for ENI (Ericsson Network Infrastructure) devices. It allows users to edit configuration files that control ENI servers and Raspberry Pi devices in your network.

### User Types
- **ENI-USER**: Can edit user-specific configuration settings
- **ENI-SUPERUSER**: Has full access including system settings, SSH operations, and TLS management

### Key Features
- Secure web-based configuration editing
- SSH/SFTP synchronization with ENI devices
- Role-based access control
- TLS certificate management
- Device inventory management
- Configuration backup and deployment

---

## Getting Started

### Accessing ENI-Editor

1. **Open your web browser** and navigate to the ENI-Editor URL
   - HTTP: `http://your-server:8080`
   - HTTPS: `https://your-server:443` (if TLS is configured)

2. **Login** with your credentials provided by your system administrator

### First Time Setup

If this is your first time using ENI-Editor, you'll need to:

1. **Contact your administrator** to create your user account
2. **Receive login credentials** (username and password)
3. **Access the application** using the provided URL

---

## ENI-USER Guide

ENI-USER accounts can edit user-specific configuration settings for ENI devices.

### Available Features

#### 1. Configuration Editing
ENI-USERs can modify the following configuration parameters:

**Ping Test Settings:**
- `RP1_PING_COMMENT` - Description for ping test device 1
- `RP1_PING_LOCATION` - Physical location of ping test device 1
- `RP2_PING_COMMENT` - Description for ping test device 2
- `RP2_PING_LOCATION` - Physical location of ping test device 2
- *(continues for each RP device)*

**Bandwidth Test Settings:**
- `RP1_BW_COMMENT` - Description for bandwidth test device 1
- `RP1_BW_LOCATION` - Physical location of bandwidth test device 1
- `RP2_BW_COMMENT` - Description for bandwidth test device 2
- `RP2_BW_LOCATION` - Physical location of bandwidth test device 2
- *(continues for each RP device)*

### Step-by-Step Configuration

#### Step 1: Access Configuration
1. Login to ENI-Editor
2. Navigate to the **Config** tab
3. You'll see a form with all editable configuration fields

#### Step 2: Edit Configuration Values
1. **Locate the device** you want to configure (RP1, RP2, RP3, etc.)
2. **Fill in the required fields**:
   - **PING_COMMENT**: Enter a descriptive name for your ping test device
   - **PING_LOCATION**: Enter the physical location (e.g., "SW_Door1", "Building_A_Room_101")
   - **BW_COMMENT**: Enter a descriptive name for your bandwidth test device
   - **BW_LOCATION**: Enter the physical location for bandwidth testing

#### Step 3: Save Changes
1. Click **Save** to store your configuration changes
2. Your changes will be saved to the local database

#### Step 4: Deploy Configuration (Request from Superuser)
1. Contact your ENI-SUPERUSER to deploy the configuration to the ENI devices
2. The superuser will use the **Commit Config** feature to push changes to all Raspberry Pi devices

### Configuration Examples

#### Example 1: Single Device Setup
```
RP1_PING_COMMENT="Main_Test_Device"
RP1_PING_LOCATION="Central_Office_Room_5"
RP1_BW_COMMENT="Bandwidth_Test_Unit_A"
RP1_BW_LOCATION="Central_Office_Room_5"
```

#### Example 2: Multiple Device Setup
```
RP1_PING_COMMENT="North_Building_Device"
RP1_PING_LOCATION="Building_N_Floor_2"
RP1_BW_COMMENT="North_BW_Test"
RP1_BW_LOCATION="Building_N_Floor_2"

RP2_PING_COMMENT="South_Building_Device"
RP2_PING_LOCATION="Building_S_Floor_1"
RP2_BW_COMMENT="South_BW_Test"
RP2_BW_LOCATION="Building_S_Floor_1"
```

### Best Practices for ENI-USERs

1. **Use descriptive comments**: Make it easy to identify devices
2. **Be consistent with location naming**: Use a standard format (Building_Room, Floor_Room, etc.)
3. **Coordinate with team members**: Ensure device names don't conflict
4. **Test configurations**: Work with your superuser to test changes before full deployment
5. **Document changes**: Keep track of what you've modified and why

---

## ENI-SUPERUSER Guide

ENI-SUPERUSER accounts have full access to all system features including configuration editing, SSH operations, TLS management, and device administration.

### Available Features

#### 1. System Configuration Management
ENI-SUPERUSERs can modify all configuration parameters including:

**System Settings:**
- `EMAIL_RECIPIENT` - Email address for notifications
- `RETRY_COUNT` - Number of retry attempts for operations
- `LOG_LEVEL` - Logging verbosity (info, debug, error)
- `X_ECM_API_ID` - ECM API identifier
- `X_ECM_API_KEY` - ECM API authentication key
- `X_CP_API_ID` - CP API identifier
- `X_CP_API_KEY` - CP API authentication key

**Network Configuration:**
- `NET_DEVICE_API_URL` - Network device API endpoint
- `NET_DEVICE_METRICS_API_URL` - Network device metrics API endpoint
- `NET_DEVICE_SIGNAL_SAMPLES_API_URL` - Signal samples API endpoint
- `ACCOUNT` - Account API endpoint
- `USERNAME` - System username
- `PASS` - System password
- `DOMAIN` - Network domain (e.g., "ericsson")

**File Operations:**
- `Output_Dir` - Output directory path
- `WINDOWS_SHARE` - Windows share path
- `PUSH_FILES` - Enable/disable file pushing (YES/NO)
- `TARGET` - Target IP address for operations
- `GPORT` - Gateway port number

**Device-Specific Settings (for each RP):**
- `RP1_API_ROUTER_IP` - IP address of API router for device 1
- `RP1_CP_ROUTER_ID` - CradlePoint router ID for device 1
- `RP1_TCP_UPLINK_ARGS` - TCP uplink test arguments
- `RP1_TCP_DOWNLINK_ARGS` - TCP downlink test arguments
- *(continues for each RP device)*

#### 2. Device Management

##### Adding New Devices
1. Navigate to **Superuser → Devices**
2. Click **Add Device**
3. Fill in device information:
   - **Name**: Descriptive name (e.g., "ENI_Server_Main", "RP_Test_Device_1")
   - **Host**: IP address or hostname
   - **Port**: SSH port (default: 22)
   - **Type**: Select "ENI_SERVER" or "RASPBERRY_PI"
   - **Active**: Check to enable the device

##### Managing Existing Devices
1. View all devices in the device list
2. **Edit**: Click on a device to modify its settings
3. **Delete**: Remove devices that are no longer needed
4. **Enable/Disable**: Toggle device active status

#### 3. SSH Key Management

##### Uploading SSH Keys
1. Navigate to **Superuser → SSH**
2. **Generate or obtain** SSH key pair:
   ```bash
   # Generate new SSH key pair
   ssh-keygen -t rsa -b 4096 -f id_rsa
   ```
3. **Upload the key files**:
   - **Private Key**: Upload `id_rsa` (will be encrypted and stored securely)
   - **Public Key**: Upload `id_rsa.pub` (stored in plain text)
4. Keys are automatically encrypted using AES-256-GCM encryption

##### Managing SSH Keys
- **Status**: Check if SSH keys are properly uploaded
- **Replace**: Upload new keys to replace existing ones
- **Remove**: Delete SSH keys (use with caution)

#### 4. TLS Certificate Management

##### Uploading Certificates
1. Navigate to **Superuser → TLS**
2. Choose certificate format:

**Option A: PFX Certificate**
- Upload a single `.pfx` file
- Provide passphrase if required

**Option B: PEM Certificates**
- Upload separate files:
  - `server.key` - Private key
  - `server.crt` - Certificate
  - `chain.crt` - Certificate chain (optional)

##### Managing TLS
- **Status**: Check which certificate files are present
- **Reload**: Apply new certificates without restarting the server
- **Replace**: Upload new certificates to replace existing ones

#### 5. SSH Operations

##### Getting Configuration from ENI Servers
1. Navigate to **Superuser → Config**
2. Click **Get Config**
3. The system will:
   - Connect to available ENI servers via SSH/SFTP
   - Download the current configuration file
   - Parse and store the configuration in the database
   - Display success/error messages

##### Committing Configuration to Raspberry Pi Devices
1. Navigate to **Superuser → Config**
2. Click **Commit Config**
3. The system will:
   - Generate configuration file from current settings
   - Connect to all active Raspberry Pi devices
   - Upload the configuration file
   - Display operation logs and results

##### Monitoring Operations
1. Navigate to **Superuser → Operations** (if available)
2. View operation logs to monitor:
   - Configuration fetch operations
   - Configuration deployment operations
   - Error messages and status updates

### Step-by-Step Superuser Workflow

#### Initial Setup
1. **Create user accounts** for ENI-USERs
2. **Upload SSH keys** for ENI server access
3. **Configure TLS certificates** (optional but recommended)
4. **Add ENI devices** to the inventory
5. **Set system configuration** parameters

#### Daily Operations
1. **Review configuration changes** made by ENI-USERs
2. **Get latest configuration** from ENI servers if needed
3. **Deploy configuration** to Raspberry Pi devices
4. **Monitor operation logs** for any issues

#### Maintenance Tasks
1. **Rotate SSH keys** periodically
2. **Update TLS certificates** before expiration
3. **Review and clean up** device inventory
4. **Backup configuration** data

### IP Address Management

**Yes, the ENI-Editor does take IP addresses as data for each RP (Raspberry Pi device).**

#### IP Address Fields:
1. **Device Host IP**: Each device in the inventory has a `host` field that stores the IP address
2. **API Router IP**: Each RP device has an `RP*_API_ROUTER_IP` field for its API router
3. **Target IP**: The `TARGET` field specifies the target IP for operations

#### IP Address Configuration Examples:
```
# Device inventory IPs
RP1_API_ROUTER_IP="100.66.27.8"
RP2_API_ROUTER_IP="100.66.27.9"
RP3_API_ROUTER_IP="100.66.27.10"

# Target IP for operations
TARGET="198.19.255.253"
```

### Security Best Practices for ENI-SUPERUSERs

1. **Use strong SSH keys**: Generate 4096-bit RSA keys or use Ed25519
2. **Rotate credentials regularly**: Change SSH keys and passwords periodically
3. **Monitor access logs**: Review who is accessing the system
4. **Use HTTPS**: Always configure TLS certificates for production use
5. **Backup configurations**: Regularly export and backup configuration data
6. **Limit user access**: Only create accounts for users who need access
7. **Test changes**: Always test configuration changes in a development environment first

---

## Troubleshooting

### Common Issues

#### Login Problems
- **Symptom**: Cannot log in to the application
- **Solutions**:
  - Verify username and password are correct
  - Check with administrator if account is active
  - Clear browser cookies and cache
  - Try a different browser

#### Configuration Not Saving
- **Symptom**: Changes don't persist after saving
- **Solutions**:
  - Check if all required fields are filled
  - Verify you have permission to edit the configuration
  - Try refreshing the page and making changes again
  - Contact your superuser if issues persist

#### SSH Operations Failing
- **Symptom**: Cannot get/commit configuration
- **Solutions**:
  - Verify SSH keys are properly uploaded
  - Check that ENI devices are reachable
  - Review operation logs for specific error messages
  - Ensure device inventory is up to date

#### TLS Certificate Issues
- **Symptom**: HTTPS not working or certificate errors
- **Solutions**:
  - Verify certificate files are properly uploaded
  - Check certificate expiration dates
  - Ensure certificate matches the server hostname
  - Try reloading the TLS configuration

### Error Messages

#### "NOT NULL constraint failed"
- **Cause**: Required fields are missing from configuration
- **Solution**: Fill in all required fields before saving
- **Example**: `NOT NULL constraint failed: settings.linux_source_path`

#### "SSH connection failed"
- **Cause**: Cannot connect to ENI device
- **Solutions**:
  - Check device IP address and port
  - Verify SSH keys are correct
  - Ensure device is online and accessible
  - Check network connectivity
- **Debug Steps**:
  ```bash
  # Test connectivity
  ping 192.168.1.100
  telnet 192.168.1.100 22
  
  # Test SSH manually
  ssh -i /path/to/private/key root@192.168.1.100
  ```

#### "Permission denied"
- **Cause**: Insufficient privileges for the operation
- **Solution**: Contact your superuser or check your user role

#### "No ENI server accessible"
- **Cause**: All ENI servers are unreachable
- **Solutions**:
  - Check device inventory for active ENI servers
  - Verify network connectivity to all ENI servers
  - Ensure SSH keys are properly uploaded
  - Check operation logs for specific error details

#### "Failed pushing to [device]"
- **Cause**: SFTP operation failed on target device
- **Solutions**:
  - Check target directory permissions
  - Ensure target directory exists
  - Verify disk space on target device
  - Check if device is online and accessible

#### "Invalid credentials"
- **Cause**: Authentication failure
- **Solutions**:
  - Verify username and password
  - Check if account exists and is active
  - Clear browser cookies and try again
  - Contact administrator if issues persist

#### "forbidden"
- **Cause**: Insufficient permissions for superuser operations
- **Solutions**:
  - Ensure you're logged in as ENI-SUPERUSER
  - Check session hasn't expired
  - Re-authenticate if necessary

---

## FAQ

### General Questions

**Q: What is the difference between ENI-USER and ENI-SUPERUSER?**
A: ENI-USER can only edit user-specific configuration settings (ping/bandwidth test comments and locations). ENI-SUPERUSER has full access including system settings, SSH operations, TLS management, and device administration.

**Q: Can I change my user role?**
A: User roles are managed by the system administrator. Contact your superuser to request role changes.

**Q: How often should I update configurations?**
A: Update configurations as needed for your testing requirements. Coordinate with your team to avoid conflicts.

### Technical Questions

**Q: What SSH key format should I use?**
A: Use RSA 4096-bit keys or Ed25519 keys. The system supports standard OpenSSH key formats.

**Q: Can I use hostnames instead of IP addresses?**
A: Yes, you can use hostnames in the device host field, but ensure they resolve correctly via DNS.

**Q: How do I backup my configuration?**
A: Configuration data is stored in the SQLite database. Contact your superuser for backup procedures.

**Q: What happens if an ENI device is offline during commit?**
A: The system will skip offline devices and continue with available ones. Check operation logs for details.

### Security Questions

**Q: Are my SSH keys secure?**
A: Yes, private SSH keys are encrypted using AES-256-GCM encryption before storage.

**Q: Can I access the system from anywhere?**
A: Access depends on your network configuration and firewall rules. HTTPS is recommended for remote access.

**Q: How do I know if my session is secure?**
A: Look for the HTTPS indicator in your browser and verify the certificate is valid.

---

## Support

For additional support:
1. **Check the operation logs** for error details
2. **Contact your ENI-SUPERUSER** for system-related issues
3. **Review this user guide** for common solutions
4. **Document any issues** you encounter for troubleshooting

---

*Last Updated: $(date)*
*Version: 1.0*