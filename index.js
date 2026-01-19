require("dotenv").config();
const Fastify = require('fastify');
const cookie = require('@fastify/cookie');
const session = require('@fastify/session');
const fastifyStatic = require('@fastify/static');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { sendVerificationEmail } = require('./utils/email.js');
const { 
  connectDb,
  createUser,
  getUserBy,
  updateUser
} = require('./db/db.js');

const fastify = Fastify({ logger: false });

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
});
fastify.register(cookie);
fastify.register(session, {
  secret: process.env.SESSION_SECRET || "jsndb$:$$:376hshshdbdb",
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60,
    httpOnly: true,
  },
  saveUninitialized: false,
  resave: false,
});



const authVerification = async (request, reply) => {
  if (!request.session.user) {
    return reply.redirect('/auth/signin');
  };
  const user = await getUserBy({
    _id: request.session.user
  });
  if (!user){
    return reply.redirect('/auth/signin');
  };
  request.user = user;
};


fastify.get('/', async (request, reply) => {
  return reply.sendFile("index.html");
});


fastify.get('/auth/signup', async (request, reply) => {
  if (request.session.user){
    return reply.redirect('/me');
  };
  if (request.session.unverified === true){
    return reply.redirect('/auth/verification');
  };
  return reply.sendFile("auth/signup.html");
});



fastify.get('/auth/signin', async (request, reply) => {
  if (request.session.user){
    return reply.redirect('/me');
  };
  if (request.session.unverified === true){
    return reply.redirect('/auth/verification');
  };
  return reply.sendFile("auth/signin.html");
});


fastify.get('/auth/verification', async (request, reply) => {
  if (request.session.user){
    return reply.redirect('/me');
  };
  if (request.session.unverified !== true){
    return reply.redirect('/auth/signin');
  };
  return reply.sendFile("auth/verification.html");
});




fastify.post('/auth/signup', async (request, reply) => {
  console.log(req.body);
  
  const { email, phone, password, c } = request.body;
  if (!email || !phone || !password){
    return reply.send({
      success: false,
      error: "Please fill in all fields"
    });
  };
  if (email.length < 5 || !email.includes('@') || !email.includes('.')){
    return reply.send({
      success: false,
      error: "Please enter a valid email address"
    });
  };
  if (phone.length !== 10 || isNaN(phone)){
    return reply.send({
      success: false,
      error: "Please enter a valid phone number"
    });
  };
  if (password.length < 8){
    return reply.send({
      success: false,
      error: "Password must be at least 8 characters long"
    });
  };

  const activationCode = uuidv4();

  try {
  const _id = await createUser({
    activated: false,
    activationCode,
    activationCodeExpires: Date.now() + (60 * 30 * 1000),
    linkSent: 0,
    email: email,
    phone: phone,
    password: password
  });
    
  if (!_id){
    return reply.send({
      success: false,
      error: "Error while creating your account. Please try again later!"
    });
  };

  await sendVerificationEmail(email, activationCode);
    
  return reply.send({
    success: true
  });
  }  catch (error){
    console.log(error.message);
    return reply.send({
      success: false,
      error: error.message
    });
  };
});



fastify.get('/auth/activate', async (request, reply) => {
  const { token } = request.query;
  if (!token){
    return reply.send({
      error: "Invalid activation link. Please try again!"
    });
  };
  const user = await getUserBy({
    activationCode: token
  });
  if (!user){
    return reply.send({
      error: "Invalid activation link. Please try again!"
    });
  };
  if (user.activated === true){
    return reply.redirect('/auth/signin');
  };
  if (user.activationCodeExpires < Date.now()){
    return reply.send({
      error: "Activation link has expired. Please request a new one!"
    });
  };
  const done = await updateUser({_id: user._id}, {$set: {
    activated: true,
  }, $unset: {
    activationCode: "",
    activationCodeExpires: "",
    linkSent: ""
  }});
  if (!done){
    return reply.send({
      error: "Error while activating your account. Please try again later!"
    });
  };
  console.log(user._id);
  request.session.user = user._id;
  return reply.redirect('/me');
});






fastify.get('/me',{preHandler: authVerification}, async (request, reply) => {
  return reply.sendFile("me/index.html");
});





fastify.get('/logout', async (request, reply) => {
  request.session.destroy();
  return reply.redirect('/auth/signin');
});



const start =  async () => {
  try {

    await connectDb();
    
    await fastify.listen({ port: 3000, host: '0.0.0.0' })

    console.log(`✅ Server is running on port ${fastify.server.address().port}`);

  }  catch (err){
    console.log(err);
  }
}

start();