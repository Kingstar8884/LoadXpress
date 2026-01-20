const { MongoClient } = require('mongodb');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { sendVerificationEmail } = require('../utils/email.js');
const saltRounds = 10;

let users = null;

const connectDb = async () => {
  try {
    client = new MongoClient(process.env.MONGO_URI)
    await client.connect();
    console.log('✅ Database Connected');
    const db = client.db('loadxpress');
    users = db.collection('users');

    const indexes = await users.indexes();
    if (!indexes.find(index => index.name === 'email_1')){
      await users.createIndex({ email: 1 }, { unique: true });
      console.log('✅ Email Index Created');
    };
    if (!indexes.find(index => index.name === 'phone_1')){
      await users.createIndex({ phone: 1 }, { unique: true, sparse: true });
      console.log('✅ Phone Index Created');
    };
    if (!indexes.find(index => index.name === 'uid_1')){
      await users.createIndex({ uid: 1 }, { unique: true });
      console.log('✅ UID Index Created');
    };
    if (!indexes.find(index => index.name === 'googleId_1')){
      await users.createIndex({ googleId: 1 }, { unique: true, sparse: true });
      console.log('✅ Google ID Index Created');
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
    return false;
  };
};



module.exports = {
  connectDb,
  createUser,
  getUserBy,
  updateUser
};