# SmartShake Backend

A modern, secure Node.js/TypeScript backend API with phone-based OTP authentication, JWT token management, and PostgreSQL database integration.

## 🚀 Features

- **Phone-based Authentication**: OTP verification for secure user registration and login
- **JWT Token Management**: Access and refresh tokens with blacklisting capability
- **User Management**: Complete CRUD operations for user accounts
- **Security First**: Helmet, CORS, rate limiting, and secure password handling
- **Database Management**: Prisma ORM with PostgreSQL and automated migrations
- **Docker Support**: Containerized deployment with Docker Compose
- **Health Monitoring**: Built-in health check endpoints
- **TypeScript**: Full type safety and modern development experience

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Authentication**: JWT + OTP
- **Containerization**: Docker & Docker Compose
- **Development**: ts-node-dev for hot reload

## 📋 Prerequisites

Before getting started, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Docker](https://www.docker.com/) (for containerized deployment)
- [Docker Compose](https://docs.docker.com/compose/) (for multi-container setup)

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd SmartShakeBackend

# Run the automated setup script
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Option 2: Manual Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd SmartShakeBackend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npx prisma generate

# Start PostgreSQL with Docker
docker-compose up -d postgres

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npm run db:seed

# Start development server
npm run dev
```

## 🌍 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL="postgresql://smartshake_user:smartshake_password@localhost:5432/smartshake_db?schema=public"

# PostgreSQL Docker Configuration
POSTGRES_USER=smartshake_user
POSTGRES_PASSWORD=smartshake_password
POSTGRES_DB=smartshake_db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=*

# OTP Configuration (Add your SMS service credentials)
# SMS_API_KEY=your_sms_service_api_key
# SMS_SENDER_ID=your_sender_id
```

## 🗄️ Database Setup

### Using Docker (Recommended)

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Run migrations
npx prisma migrate dev

# View database in Prisma Studio
npx prisma studio
```

### Manual PostgreSQL Setup

```bash
# Install PostgreSQL locally
# Create database
createdb smartshake_db

# Update DATABASE_URL in .env
# Run migrations
npx prisma migrate dev
```

## 📡 API Documentation

### Base URL
- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

### Health Check

```http
GET /health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-20T10:30:00.000Z",
    "service": "SmartShake Backend",
    "database": "connected"
  }
}
```

### Authentication Endpoints

#### 1. Start Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "phone": "+1234567890",
  "name": "John Doe"
}
```

#### 2. Start Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "+1234567890"
}
```

#### 3. Verify OTP

```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+1234567890",
  "code": "123456",
  "purpose": "LOGIN" // or "REGISTRATION"
}
```

#### 4. Refresh Token

```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### 5. Get Profile

```http
GET /api/auth/profile
Authorization: Bearer your-access-token
```

#### 6. Logout

```http
POST /api/auth/logout
Authorization: Bearer your-access-token
```

#### 7. Logout from All Devices

```http
POST /api/auth/logout-all
Authorization: Bearer your-access-token
```

### User Management Endpoints

#### 1. Get All Users

```http
GET /api/users
Authorization: Bearer your-access-token
```

#### 2. Get User by ID

```http
GET /api/users/{id}
Authorization: Bearer your-access-token
```

#### 3. Create User

```http
POST /api/users
Content-Type: application/json

{
  "phone": "+1234567890",
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword"
}
```

#### 4. Update User

```http
PUT /api/users/{id}
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

#### 5. Delete User

```http
DELETE /api/users/{id}
Authorization: Bearer your-access-token
```

## 🔐 Authentication Flow

### Registration Flow

1. **Start Registration**: `POST /api/auth/register` with phone and name
2. **Receive OTP**: User receives OTP code via SMS
3. **Verify OTP**: `POST /api/auth/verify-otp` with phone, code, and purpose "REGISTRATION"
4. **Account Verified**: User receives access and refresh tokens

### Login Flow

1. **Start Login**: `POST /api/auth/login` with phone number
2. **Receive OTP**: User receives OTP code via SMS
3. **Verify OTP**: `POST /api/auth/verify-otp` with phone, code, and purpose "LOGIN"
4. **Authenticated**: User receives access and refresh tokens

### Security Features

- **Rate Limiting**: Maximum 5 OTP requests per hour per phone number
- **Token Blacklisting**: Logout invalidates tokens permanently
- **Secure Headers**: Helmet.js for security headers
- **CORS Protection**: Configurable CORS policies
- **Input Validation**: Comprehensive request validation

## 🐳 Docker Deployment

### Development

```bash
# Start development environment
docker-compose --profile development up
```

### Production

```bash
# Build and start production environment
docker-compose up --build -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Docker Commands

```bash
# View running containers
docker-compose ps

# Execute commands in container
docker-compose exec app sh

# View database logs
docker-compose logs postgres

# Restart specific service
docker-compose restart app
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start           # Start production server

# Database
npm run db:migrate   # Run database migrations
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database with initial data
npm run db:reset     # Reset database (⚠️ Destructive)
```

### Project Structure

```
SmartShakeBackend/
├── src/
│   ├── app.ts                 # Express app configuration
│   ├── index.ts               # Server entry point
│   ├── config/
│   │   └── database.ts        # Database configuration
│   ├── controllers/           # Request handlers
│   │   ├── authController.ts  # Authentication logic
│   │   ├── userController.ts  # User management
│   │   └── healthController.ts # Health checks
│   ├── middleware/            # Express middleware
│   │   ├── authMiddleware.ts  # JWT authentication
│   │   └── errorHandler.ts    # Error handling
│   ├── routes/                # API route definitions
│   │   ├── index.ts          # Main router
│   │   ├── authRoutes.ts     # Auth endpoints
│   │   ├── userRoutes.ts     # User endpoints
│   │   └── healthRoutes.ts   # Health endpoints
│   ├── services/              # Business logic
│   │   ├── userService.ts    # User operations
│   │   ├── otpService.ts     # OTP management
│   │   ├── jwtService.ts     # JWT operations
│   │   └── cleanupService.ts # Background tasks
│   └── types/
│       └── index.ts          # TypeScript definitions
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # Database migrations
│   └── seed.ts              # Database seeding
├── docker/
│   └── postgres/
│       └── init.sql/         # Database initialization
├── scripts/
│   └── setup.sh             # Setup automation
├── docker-compose.yml        # Multi-container setup
├── Dockerfile               # Container definition
└── package.json            # Project dependencies
```

### Code Style and Standards

- **TypeScript**: Strict type checking enabled
- **ES Modules**: Modern import/export syntax
- **Async/Await**: Consistent asynchronous programming
- **Error Handling**: Centralized error handling middleware
- **Validation**: Input validation on all endpoints
- **Security**: OWASP security best practices

## 🔧 Database Schema

### Users Table

| Field      | Type      | Description                    |
|------------|-----------|--------------------------------|
| id         | Integer   | Primary key (auto-increment)   |
| phone      | String    | Unique phone number            |
| email      | String    | Optional email address         |
| name       | String    | User's full name               |
| password   | String    | Optional hashed password       |
| isVerified | Boolean   | Account verification status    |
| createdAt  | DateTime  | Account creation timestamp     |
| updatedAt  | DateTime  | Last update timestamp          |

### OTP Codes Table

| Field     | Type      | Description                |
|-----------|-----------|----------------------------|
| id        | Integer   | Primary key                |
| phone     | String    | Associated phone number    |
| code      | String    | OTP code                   |
| purpose   | Enum      | LOGIN/REGISTRATION/RESET   |
| expiresAt | DateTime  | Expiration timestamp       |
| used      | Boolean   | Usage status               |
| userId    | Integer   | Foreign key to users       |
| createdAt | DateTime  | Creation timestamp         |

### Blacklisted Tokens Table

| Field     | Type     | Description                    |
|-----------|----------|--------------------------------|
| id        | Integer  | Primary key                    |
| tokenHash | String   | Hashed JWT token               |
| userId    | Integer  | Foreign key to users           |
| expiresAt | DateTime | Original token expiration      |
| reason    | String   | Blacklisting reason            |
| createdAt | DateTime | Blacklisting timestamp         |

## 🚨 Error Handling

### API Error Responses

All API errors follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## 🔒 Security Considerations

### Production Checklist

- [ ] Change default JWT secret
- [ ] Set strong database passwords
- [ ] Configure CORS for specific origins
- [ ] Enable HTTPS/TLS encryption
- [ ] Set up rate limiting
- [ ] Configure SMS service credentials
- [ ] Enable database connection encryption
- [ ] Set up monitoring and logging
- [ ] Configure firewall rules
- [ ] Set up backup strategies

### Security Headers

The application automatically sets the following security headers via Helmet.js:

- `Content-Security-Policy`
- `X-DNS-Prefetch-Control`
- `X-Frame-Options`
- `X-Powered-By` (removed)
- `X-Content-Type-Options`
- `Referrer-Policy`

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

#### Prisma Client Not Generated

```bash
# Regenerate Prisma client
npx prisma generate

# Reset and regenerate
npm run db:reset
npx prisma generate
```

#### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

#### JWT Token Issues

```bash
# Check JWT_SECRET in .env
cat .env | grep JWT_SECRET

# Clear blacklisted tokens
# Connect to database and truncate blacklisted_tokens table
```

### Logs and Debugging

```bash
# View application logs
docker-compose logs -f app

# View all service logs
docker-compose logs

# Enable debug mode
NODE_ENV=development npm run dev
```

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [JWT.io](https://jwt.io/) - JWT token debugger
- [Docker Documentation](https://docs.docker.com/)


### Development Guidelines

- Follow existing code patterns and TypeScript types
- Add tests for new features
- Update documentation for API changes
- Ensure Docker builds successfully
- Test database migrations
