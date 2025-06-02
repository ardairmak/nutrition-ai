# 🍎 AI-Powered Nutrition & Fitness Tracking App

A comprehensive React Native mobile application with Node.js backend that uses AI to analyze food images, track nutrition, and provide personalized health insights.

## 🌟 **Key Features**

### **🔍 AI-Powered Food Recognition**

- **Smart Camera Analysis** - Take photos of meals for instant nutrition breakdown
- **OpenAI Integration** - Advanced image recognition and calorie estimation
- **Automatic Macro Calculation** - Protein, carbs, fat, fiber tracking

### **📊 Advanced Analytics & Insights**

- **Real-time Progress Charts** - Weight trends, calorie patterns, macro distributions
- **Goal-Based Recommendations** - Personalized nutrition advice based on fitness objectives
- **AI Health Insights** - Weekly performance analysis and actionable recommendations
- **Predictive Analytics** - Goal achievement probability and timeline estimation

### **👥 Social Features**

- **Friend System** - Connect with friends and share progress
- **Achievement System** - Gamified fitness milestones
- **Progress Sharing** - Motivational social interactions

### **🔐 Enterprise-Grade Security**

- **JWT Authentication** - Secure token-based auth with proper expiration
- **Rate Limiting** - API abuse prevention (Auth: 5/15min, General: 100/15min)
- **Input Validation** - Comprehensive data sanitization with Zod schemas
- **Password Security** - bcrypt hashing with salt rounds
- **Environment Validation** - Startup security checks

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Native   │    │    Node.js      │    │   PostgreSQL    │
│   Mobile App    │◄──►│   Express API   │◄──►│   Database      │
│                 │    │                 │    │                 │
│ • Charts        │    │ • Authentication│    │ • User Data     │
│ • Camera        │    │ • AI Integration│    │ • Meal History  │
│ • Navigation    │    │ • File Upload   │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   External APIs │
                    │                 │
                    │ • OpenAI GPT-4  │
                    │ • AWS S3        │
                    │ • Email Service │
                    └─────────────────┘
```

## 🚀 **Quick Start**

### **Prerequisites**

- Node.js 18+
- PostgreSQL 13+
- React Native development environment
- OpenAI API key (optional)
- AWS account for S3 (optional)

### **Backend Setup**

```bash
cd server
npm install

# Create .env file (use .env.example as template)
cp .env.example .env

# Setup database
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

### **Mobile App Setup**

```bash
cd mobile
npm install

# iOS
npx expo start --ios

# Android
npx expo start --android
```

## 📱 **Mobile App Features**

### **Core Screens**

- **Dashboard** - Overview of daily nutrition and goals
- **Camera** - AI-powered food image analysis
- **Progress** - Advanced charts and analytics
- **Journal** - Meal history and detailed tracking
- **Profile** - Settings, goals, and social features

### **Advanced UI/UX**

- **Modern Design** - Clean, intuitive interface
- **Smooth Animations** - Optimized performance
- **Offline Support** - Core functionality without internet
- **Responsive Charts** - Interactive data visualizations

## 🛡️ **Security Features**

### **Authentication & Authorization**

```typescript
// JWT with proper validation
const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: "24h" });

// Rate limiting by endpoint
app.use("/api/auth", authLimiter); // 5 requests/15min
app.use("/api", apiLimiter); // 100 requests/15min
```

### **Input Validation**

```typescript
// Strong password requirements
const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/) // Uppercase
  .regex(/[a-z]/) // Lowercase
  .regex(/[0-9]/) // Numbers
  .regex(/[^A-Za-z0-9]/); // Special chars
```

### **Data Protection**

- **CORS Configuration** - Restricted origins
- **Helmet.js** - Security headers
- **bcrypt** - Password hashing (rounds: 10)
- **Input Sanitization** - XSS prevention
- **SQL Injection Prevention** - Prisma ORM

## 🚀 **Performance Optimizations**

### **Database**

- **Query Optimization** - Efficient indexes and pagination
- **Connection Pooling** - Prisma connection management
- **Caching Layer** - In-memory user data caching
- **Batch Operations** - Reduced N+1 queries

### **Mobile App**

- **Image Optimization** - Compressed uploads with Sharp
- **Lazy Loading** - Optimized component rendering
- **Chart Performance** - Efficient data visualization
- **State Management** - Context API optimization

## 🧪 **Testing**

```bash
# Run backend tests
cd server
npm test

# Test coverage report
npm run test:coverage
```

**Test Coverage:**

- Authentication flows
- User management
- API endpoints
- Error handling scenarios

## 📊 **API Documentation**

### **Authentication Endpoints**

```typescript
POST / api / auth / login;
POST / api / auth / register;
POST / api / auth / verify;
POST / api / auth / reset - password;
```

### **Core Features**

```typescript
// User Management
GET / api / users / me;
PUT / api / users / profile;
POST / api / users / goals;

// Nutrition Tracking
POST / api / meals;
GET / api / meals / history;
POST / api / upload / meal - image;

// Analytics
GET / api / analytics / dashboard;
GET / api / analytics / progress;
GET / api / analytics / insights;
```

## 🌟 **Technical Highlights**

### **AI Integration**

- **OpenAI GPT-4** for intelligent food recognition
- **Custom prompts** for accurate nutrition estimation
- **Image preprocessing** with Sharp for optimal AI analysis

### **Real-time Analytics**

- **Custom algorithms** for goal progress calculation
- **Trend analysis** with statistical modeling
- **Predictive insights** for achievement timeline

### **Modern Development Practices**

- **TypeScript** throughout the stack
- **Prisma ORM** for type-safe database operations
- **ESLint/Prettier** for code quality
- **Environment validation** for deployment safety

## 🎯 **Project Goals Achieved**

✅ **Full-Stack Development** - React Native + Node.js  
✅ **AI Integration** - OpenAI for intelligent food analysis  
✅ **Database Design** - Normalized PostgreSQL schema  
✅ **Security Implementation** - Enterprise-grade auth & validation  
✅ **Performance Optimization** - Caching, indexing, efficient queries  
✅ **Testing Coverage** - Comprehensive test suites  
✅ **Modern UI/UX** - Professional mobile interface  
✅ **Real-time Analytics** - Advanced progress tracking

## 👥 **Team**

**Developer:** [Arda Irmak]  
**Project:** Graduation Thesis - Computer Science  
**Institution:** [Yeditepe University]  
**Year:** 2025

---

_This project demonstrates proficiency in modern full-stack development, AI integration, mobile app development, database design, security implementation, and performance optimization._
