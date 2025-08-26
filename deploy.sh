#!/bin/bash

# SmartShake Backend Deployment Script for DigitalOcean Droplet
# This script sets up and deploys the Node.js TypeScript backend

set -e  # Exit on any error

echo "🚀 Starting SmartShake Backend Deployment..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# # Check if running as root
# if [ "$EUID" -eq 0 ]; then
#     print_error "Please don't run this script as root. Run as your regular user."
#     exit 1
# fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x (LTS)
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Install build essentials (required for some Node modules)
print_status "Installing build essentials..."
sudo apt-get install -y build-essential

# Create application directory
APP_DIR="/home/$(whoami)/smartshake-backend"
print_status "Creating application directory at $APP_DIR..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs

# Install application dependencies
print_status "Installing application dependencies..."
cd $APP_DIR
npm ci --only=production

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Build TypeScript application
print_status "Building TypeScript application..."
npm run build

# Set up environment variables
if [ ! -f ".env" ]; then
    print_warning "Environment file .env not found. Creating from template..."
    cp .env.production .env
    print_warning "Please edit .env file with your actual values before continuing!"
    read -p "Press Enter after you've updated the .env file..."
fi

# Run database migrations
print_status "Running database migrations..."
npx prisma migrate deploy

# Set up PM2 ecosystem
print_status "Setting up PM2 process manager..."
pm2 delete smartshake-backend 2>/dev/null || true  # Delete if exists
pm2 start ecosystem.config.js --env development

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
print_status "Setting up PM2 startup script..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $(whoami) --hp /home/$(whoami)

# Setup log rotation
print_status "Setting up log rotation..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true

# Setup firewall (if ufw is available)
if command -v ufw &> /dev/null; then
    print_status "Configuring firewall..."
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    sudo ufw allow 3000/tcp # Node.js app (you may want to remove this if using reverse proxy)
    sudo ufw --force enable
fi

# Install and configure Nginx as reverse proxy
print_status "Installing and configuring Nginx..."
sudo apt install -y nginx

# Get droplet IP address
DROPLET_IP=$(curl -s ifconfig.me)

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/smartshake-backend > /dev/null <<EOF
server {
    listen 80;
    server_name $DROPLET_IP _;  # Using IP address instead of domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        access_log off;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/smartshake-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

print_status "Deployment completed successfully! 🎉"
print_status ""
print_status "Deployment completed successfully! 🎉"
print_status ""
print_status "Your application is running at: http://$DROPLET_IP"
print_status "Health check: http://$DROPLET_IP/health"
print_status "API Base URL: http://$DROPLET_IP/api"
print_status ""
print_status "Next steps:"
print_status "1. Update your .env file with production values"
print_status "2. Test your API endpoints"
print_status "3. (Optional) Set up a domain name and SSL certificate later"
print_status "4. Configure your frontend to use: http://$DROPLET_IP/api"
print_status ""
print_status "Useful commands:"
print_status "- View application logs: pm2 logs smartshake-backend"
print_status "- Monitor application: pm2 monit"
print_status "- Restart application: pm2 restart smartshake-backend"
print_status "- Check application status: pm2 status"
print_status "- Check Nginx status: sudo systemctl status nginx"
print_status "- Check Nginx logs: sudo tail -f /var/log/nginx/error.log"
print_status ""
print_status "To add a domain later, run: ./ssl-setup.sh yourdomain.com"
