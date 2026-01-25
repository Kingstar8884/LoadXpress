const { MongoClient } = require('mongodb');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { sendVerificationEmail } = require('../utils/email.js');
const saltRounds = 10;

let users = null, codes = null, transactions = null;

const connectDb = async () => {
  try {
    client = new MongoClient(process.env.MONGO_URI)
    await client.connect();
    console.log('✅ Database Connected');
    const db = client.db();
    users = db.collection('users');
    transactions = db.collection('transactions');
    codes = db.collection('codes');
    const usersCollection = await db.listCollections({name: 'users'}).toArray();
    if (!usersCollection.length){
      await db.createCollection('users');
      console.log('✅ Users Collection Created!');
    };
    const userIndexes = await users.indexes();
    if (!userIndexes.find(index => index.name === 'email_1')){
      await users.createIndex({ email: 1 }, { unique: true });
      console.log('✅ Email Index Created');
    };
    if (!userIndexes.find(index => index.name === 'phone_1')){
      await users.createIndex({ phone: 1 }, { unique: true, sparse: true });
      console.log('✅ Phone Index Created');
    };
    if (!userIndexes.find(index => index.name === 'uid_1')){
      await users.createIndex({ uid: 1 }, { unique: true });
      console.log('✅ UID Index Created');
    };
    if (!userIndexes.find(index => index.name === 'googleId_1')){
      await users.createIndex({ googleId: 1 }, { unique: true, sparse: true });
      console.log('✅ Google ID Index Created');
    };


    const codesCollection = await db.listCollections({name: 'codes'}).toArray();
    if (!codesCollection.length){
      await db.createCollection('codes');
      console.log('✅ Codes Collection Created!');
    };
    const codesIndexes = await codes.indexes();
    if (!codesIndexes.find(index => index.name === 'expiresAt_1')){
      await codes.createIndex({expiresAt: 1}, {expireAfterSeconds: 0});
      console.log('✅ Codes Auto Delete Initialized!');
    };
  } catch (error) {
    throw new Error('🚨 Error connecting to MongoDB:'+ error);
  }
};



const getUserBy = async (info) => {
  try {
    const user = await users.findOne(info);
    return user;
  } catch (error){
    console.log(error);
    return null;
  };
};



const createUser = async (data) => {
  let toCheck = [];
  
  data.uid = nanoid(16);
  toCheck.push({uid: data.uid});
  
  data.email = data.email.toLowerCase();
  toCheck.push({email: data.email});
  
  if (data.signupWith === "email"){
    toCheck.push({phone: data.phone});
  };

  if (data.signupWith === "google"){
    toCheck.push({googleId: data.googleId});
  };

  
  const user = await getUserBy({
    $or: toCheck
  });
  
  if (user){
    if (user.activated === false){
      const activationCode = uuidv4();
      await sendVerificationEmail(user.email, activationCode);
      await updateUser({_id: user._id}, {
        $set: {
          activationCode,
          activationCodeExpires: Date.now() + (60 * 30 * 1000),
        },
        $inc: {
          linkResent: 1
        }
      });
    };
    throw new Error('Cannot register with provided information.');
  };

  if (data.signupWith === "email"){
    data.password = await bcrypt.hash(data.password, saltRounds);
  };
  
  try {
    const result = await users.insertOne(data)
    return result.insertedId;
  } catch (error){
    console.log(error);
    return null;
  }
};


const updateUser = async (_id, data) => {
  try {
    const result = await users.updateOne(_id, data);
    return result.modifiedCount > 0;
  } catch (error) {
    console.log(error);
    throw new Error('Error updating user');
  };
};


const createCode = async (data) => {
  try {
    await codes.insertOne(data);
    return true;
  } catch (error){
    console.log(error);
    throw new Error('Error creating code');
  };
};


const getCodeBy = async (data) => {
  try {
    const code = await codes.findOne(data);
    return code;
  } catch (error){
    console.log(error);
    return null;
  };
};

const deleteCode = async (data) => {
  try {
    await codes.deleteOne(data);
    return true;
  } catch (error){
    console.log(error);
    return false;
  };
};


const addTransaction = async (data) => {
  try {
    await transactions.insertOne(data);
    return true;
  } catch (error){
    console.log(error);
    return false;
  };
};


const getTransactions = async (userId, limit = 10) => {
  try {
    // Weekly totals for chart
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diffToMonday = day === 0 ? 6 : day - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMonday);
    startOfWeek.setHours(0,0,0,0);
    const weeklyData = await transactions.aggregate([
      { $match: { userId, createdAt: { $gte: startOfWeek } } },
      { $group: { _id: { $dayOfWeek: "$createdAt" }, total: { $sum: "$amount" } } }
    ]).toArray();
    const totals = Array(7).fill(0);
    weeklyData.forEach(r => { totals[r._id - 1] = r.total; });
    const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const data = totals.slice(1).concat(totals[0]);
    const trans = await transactions.find({ userId })
      .sort({ createdAt: -1 })
      .project({
        _id: 0,
        amount: 1,
        type: 1,
        status: 1,
        sub: 1,
        subInfo: 1,
        debit: 1,
        which: 1
      })
      .limit(limit)
      .toArray()
    return {
      labels,
      data,
      transactions: trans
    };
  } catch (error){
    console.log(error);
    throw new Error('Error fetching transactions');
  };
};


module.exports = {
  connectDb,
  createUser,
  getUserBy,
  updateUser,
  createCode,
  getCodeBy,
  deleteCode,
  addTransaction,
  getTransactions
};