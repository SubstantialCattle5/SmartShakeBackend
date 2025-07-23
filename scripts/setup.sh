#!/bin/bash

# SmartShake Backend Setup Script
echo "🚀 Setting up SmartShake Backend..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your configuration"
fi

# Start PostgreSQL with Docker Compose
echo "🐘 Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate dev --name init

# Seed the database
echo "🌱 Seeding database with initial data..."
npm run db:seed

echo "✅ Setup complete!"
echo ""
echo "📖 Next steps:"
echo "  1. Update your .env file with proper values"
echo "  2. Start the development server: npm run dev"
echo "  3. Or use Docker Compose: docker-compose up"
echo ""
echo "🌐 Your API will be available at:"
echo "  - Development: http://localhost:3000"
echo "  - Health check: http://localhost:3000/health"
echo "  - Database Studio: npx prisma studio" 