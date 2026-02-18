const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri || uri.includes('<username>')) {
      console.error('\n❌ MongoDB Atlas connection string not configured!');
      console.error('Please update the .env file with your MongoDB Atlas URI.');
      console.error('Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nsoffice_hrms\n');
      process.exit(1);
    }
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
