# Quick Deployment Guide - No Domain Required

This is a simplified deployment guide for deploying your SmartShake Backend to a DigitalOcean droplet using just the IP address (no domain required).

## Step 1: Create DigitalOcean Resources

### 1.1 Create a Droplet
- **Image**: Ubuntu 22.04 LTS
- **Size**: Basic plan, 2GB RAM recommended
- **Authentication**: SSH key recommended
- **Note down the droplet IP address**

### 1.2 Create PostgreSQL Database
- Go to "Databases" in DigitalOcean dashboard
- Create PostgreSQL 14+ database
- **Important**: Copy the connection string (starts with `postgresql://`)
- Add your droplet's IP to "Trusted Sources"

## Step 2: Deploy to Droplet

### 2.1 Connect to Your Droplet
```bash
ssh root@YOUR_DROPLET_IP
```

### 2.2 Upload Your Code
```bash
# Option A: Clone from Git
git clone https://github.com/your-repo/smartshake-backend.git
cd smartshake-backend

# Option B: Upload via SCP (from your local machine)
scp -r /path/to/SmartShakeBackend root@YOUR_DROPLET_IP:~/smartshake-backend
```

### 2.3 Run Deployment Script
```bash
cd smartshake-backend
chmod +x deploy.sh
./deploy.sh
```

The script will automatically:
- Install Node.js, PM2, and dependencies
- Build your application
- Set up Nginx with your droplet IP
- Configure firewall and security

## Step 3: Configure Environment

### 3.1 Update Environment Variables
```bash
nano .env
```

**Key variables to update:**
```bash
# Database (from DigitalOcean dashboard)
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"

# Generate a secure JWT secret
JWT_SECRET="your-secure-secret-here"

# PhonePe credentials (from merchant dashboard)
PHONEPE_MERCHANT_ID="your-merchant-id"
PHONEPE_SALT_KEY="your-salt-key"

# URLs using your droplet IP
FRONTEND_URL="http://YOUR_DROPLET_IP:3001"
BACKEND_URL="http://YOUR_DROPLET_IP"
```

### 3.2 Run Database Migrations
```bash
npx prisma migrate deploy
```

### 3.3 Start Application
```bash
pm2 restart smartshake-backend
```

## Step 4: Test Your Deployment

Your API will be available at:
- **Base URL**: `http://YOUR_DROPLET_IP/api`
- **Health Check**: `http://YOUR_DROPLET_IP/health`
- **Database Health**: `http://YOUR_DROPLET_IP/health/database`

Test with curl:
```bash
curl http://YOUR_DROPLET_IP/health
```

## Step 5: Configure Your Frontend

Update your frontend configuration to use:
```javascript
const API_BASE_URL = 'http://YOUR_DROPLET_IP/api';
```

## Common Commands

```bash
# View logs
pm2 logs smartshake-backend

# Restart app
pm2 restart smartshake-backend

# Check status
pm2 status

# Monitor resources
pm2 monit

# Check Nginx
sudo systemctl status nginx
```

## Adding a Domain Later

When you get a domain name, you can easily add it:

1. Point your domain's A record to your droplet IP
2. Run the SSL setup script:
```bash
./ssl-setup.sh yourdomain.com
```

This will:
- Update Nginx configuration with your domain
- Install SSL certificate from Let's Encrypt
- Enable HTTPS

## Security Notes

- Your app is currently HTTP only (no SSL)
- For production, consider getting a domain and SSL certificate
- The firewall is configured to allow necessary ports
- Regular updates are recommended: `sudo apt update && sudo apt upgrade`

## Troubleshooting

**App not starting?**
```bash
pm2 logs smartshake-backend
```

**Database connection issues?**
- Check if your droplet IP is in the database's "Trusted Sources"
- Verify DATABASE_URL format
- Test connection: `npx prisma studio` (development only)

**Nginx issues?**
```bash
sudo nginx -t  # Test configuration
sudo tail -f /var/log/nginx/error.log  # Check logs
```

That's it! Your SmartShake Backend is now running on `http://YOUR_DROPLET_IP`
