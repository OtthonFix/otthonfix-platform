// config/database.js - MongoDB Connection

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || 'otthonfix_db';
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not configured!');
      process.exit(1);
    }

    const options = {
      dbName: dbName,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoURI, options);

    console.log('✅ MongoDB Connected Successfully');
    console.log(`   Database: ${dbName}`);

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

<<<<<<< HEAD
module.exports = connectDB;
=======
module.exports = connectDB;
>>>>>>> 3712dd3a600bf3c5af8b9ab7d5e9a74ed0e0338b
