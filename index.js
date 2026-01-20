require("dotenv").config();
const Fastify = require('fastify');
const cookie = require('@fastify/cookie');
const session = require('@fastify/session');
const fastifyStatic = require('@fastify/static');
const { OAuth2Client } = require('google-auth-library');
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
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
  try {

  let { email, phone, password, c } = request.body;
  let signupWith = "email";

  if (!c && (!email || !phone || !password)){
    return reply.send({
      success: false,
      error: "Please fill in all fields"
    });
  };
  if (c) signupWith = "google";
  
  if (signupWith === "email"){
  
  if (!email || email.length < 5 || !email.includes('@') || !email.includes('.')){
    return reply.send({
      success: false,
      error: "Please enter a valid email address!"
    });
  };
  if (!phone || phone.length !== 10 || isNaN(phone)){
    return reply.send({
      success: false,
      error: "Please enter a valid phone number!"
    });
  };
  if (!password || password.length < 8){
    return reply.send({
      success: false,
      error: "Password must be at least 8 characters long!"
    });
  };
  };
  
  let payload = null;
  if (signupWith === "google"){

    const ticket = await googleClient.getTokenInfo(c);

    if (!ticket){
      return reply.send({
        success: false,
        error: "Invalid Google token. Please try again!"
      });
    };

    if (ticket.aud !== process.env.GOOGLE_CLIENT_ID){
      return reply.send({
        success: false,
        error: "Invalid Google token. Please try again!"
      });
    };

    if (!ticket.email_verified){
      return reply.send({
        success: false,
        error: "Please verify your email with Google first!"
      });
    };

    googleClient.setCredentials({ access_token: c });

    const response = await googleClient.request({url: "https://www.googleapis.com/oauth2/v3/userinfo"});

    payload = response.data;

    if (!payload){
      return reply.send({
        success: false,
        error: "Invalid Google token. Please try again!"
      });
    };
    
  };

  let activationCode = null;

    const createObj = {
        balance: 0.00,
        activated: signupWith === "google" ? true : false,
        signupWith
      };
    if (signupWith === "email"){
      activationCode = uuidv4();
      createObj.activationCode = activationCode;
        createObj.activationCodeExpires = Date.now() + (60 * 30 * 1000);
      createObj.linkResent = 0;
        createObj.email = email;
        createObj.phone = phone;
        createObj.password = password;
        createObj.picture = "/assets/profiles/default-profile.png"
    };

    if (signupWith === "google"){
      createObj.googleId = payload.sub;
      createObj.email = payload.email;
      createObj.firstName = payload.given_name;
      createObj.lastName = payload.family_name;
      createObj.picture = payload.picture;
    };
    
  const _id = await createUser(createObj);
    
  if (!_id){
    return reply.send({
      success: false,
      error: "Error while creating your account. Please try again later!"
    });
  };

  if (signupWith === "email") await sendVerificationEmail(email, activationCode);
    
    if (signupWith === "google"){
      request.session.user = _id;
    };
    
  return reply.send({
    success: true,
    go_to: signupWith === "google" ? '/me' : false
  });
    
  } catch (error){
    console.log(error);
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