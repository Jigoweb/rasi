# RASI Database Setup Guide

## 🎯 Overview
The RASI interface has been updated to work with PostgreSQL/Supabase instead of MySQL. The server now supports both direct PostgreSQL connections and Supabase integration.

## 📋 Prerequisites
- PostgreSQL database (local or cloud)
- Node.js v16+ 
- npm packages installed

## 🔧 Configuration Steps

### 1. Database Configuration
Update the `.env` file with your database credentials:

```env
# PostgreSQL Database Configuration
DB_HOST=your-database-host
DB_PORT=5432
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=your-database-name

# Application Configuration
NODE_ENV=development
PORT=3000
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Optional: Supabase Configuration
# SUPABASE_URL=https://your-project-ref.supabase.co
# SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_KEY=your-service-key
```

### 2. Database Schema Setup
Run your SQL scripts to create the database schema:

```bash
# Run the main schema creation
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f supabase_init.sql

# Load sample data
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f supabase_sample_data_clean.sql

# Create indexes for performance
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f supabase_indexes_clean.sql
```

### 3. Start the Application
```bash
npm start
```

The application will be available at: http://localhost:3000

## 🚀 Key Features Available

### Dashboard
- **Role-based views**: Admin, Collecting, Artist
- **Real-time metrics**: Performance indicators and statistics
- **Interactive charts**: Monthly trends, revenue analysis
- **Campaign tracking**: Progress monitoring and status updates

### Artist Management
- **CRUD operations**: Create, read, update, delete artists
- **Search & filtering**: By name, status, role type
- **Pagination**: Handle large datasets efficiently
- **Export capabilities**: CSV export functionality

### Campaign Management
- **Individuazione campaigns**: Content identification workflows
- **Ripartizione campaigns**: Revenue distribution tracking
- **Progress monitoring**: Visual progress indicators
- **Status management**: Programmata, In Corso, Completata, Sospesa

### API Endpoints
The server provides RESTful API endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/monthly-trends` - Monthly trend data
- `GET /api/dashboard/distribution` - Distribution analysis
- `GET /api/artisti` - Artists list with pagination
- `GET /api/campagne` - Campaigns list with filtering

## 🔐 Authentication
The system uses JWT-based authentication. You'll need to create user accounts in the `auth.utenti` table with appropriate roles.

## 🎨 UI Features
- **Bootstrap 5**: Modern responsive design
- **Chart.js**: Interactive data visualizations
- **Role-based styling**: Different themes for user types
- **Mobile optimized**: Works on all device sizes

## 🔍 Database Queries
The application uses PostgreSQL-specific features:
- **JSON columns**: For flexible metadata storage
- **Array types**: For storing multiple values
- **Composite types**: For structured data
- **Window functions**: For analytics and reporting

## 🚨 Troubleshooting

### Database Connection Issues
1. Verify database credentials in `.env`
2. Check if PostgreSQL service is running
3. Ensure database exists and is accessible
4. Test connection with `psql` command

### Authentication Issues
1. Check if `auth.utenti` table has test users
2. Verify password hashing matches bcrypt format
3. Ensure JWT_SECRET is properly set

### Performance Issues
1. Run the indexes SQL script
2. Check database connection pool settings
3. Monitor query execution times
4. Consider adding materialized views for complex queries

## 📊 Sample Data
The system includes comprehensive sample data:
- 5 sample artists with different roles
- 5 content works (films and TV series)
- Broadcasting schedules from major Italian networks
- Campaign examples for both identification and distribution
- Revenue distribution calculations

This provides a complete testing environment to explore all features of the RASI collecting society management system.