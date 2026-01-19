const { MongoClient } = require('mongodb');
const { nanoid } = require('nanoid');
const { userSchema } = require('./schemas.js');
const bcrypt = require('bcrypt');
const saltRounds = 10;

let users = null;

const connectDb = async () => {
  try {
    client = new MongoClient(process.env.MONGO_URI)
    await client.connect();
    console.log('✅ Database Connected');
    const db = client.db('loadxpress');
    users = db.collection('users');
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
  data.uid = nanoid(16);
  data.email = data.email.toLowerCase();
  const user = await getUserBy({
    $or: [
      {email: data.email},
      {uid: data.uid},
      {phone: data.phone}
    ]
  });
  if (user){
    throw new Error('Cannot register with provided information.');
  };
  data.password = await bcrypt.hash(data.password, saltRounds);
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