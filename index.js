require("dotenv").config();
const Fastify = require('fastify');
const cookie = require('@fastify/cookie');
const session = require('@fastify/session');
const fastifyStatic = require('@fastify/static');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const { verify } = require("hcaptcha");
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { sendVerificationEmail, sendVerificationCode } = require('./utils/email.js');
const { 
  connectDb,
  createUser,
  getUserBy,
  updateUser,
  createCode,
  getCodeBy,
  deleteCode
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



const authenticate = async (request, reply) => {
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
  if (request.session.pendingLogin === true){
    return reply.redirect('/auth/verification?email='+request.session.pendingLoginEmail);
  };
  return reply.sendFile("auth/signup.html");
});



fastify.get('/auth/signin', async (request, reply) => {
  if (request.session.user){
    return reply.redirect('/me');
  };
  if (request.session.pendingLogin === true){
    return reply.redirect('/auth/verification?email='+request.session.pendingLoginEmail);
  };
  return reply.sendFile("auth/signin.html");
});


fastify.get('/auth/verification', async (request, reply) => {
  if (request.session.user){
    return reply.redirect('/me');
  };
  if (request.session.pendingLogin !== true){
    return reply.redirect('/auth/signin');
  };
  return reply.sendFile("auth/verification.html");
});


fastify.post('/auth/resend', async (request, reply) => {

  if (request.session.user){
    return reply.send({
      success: false,
      error: "Already Logged-In! Redirecting to dashboard...",
      redirect: "/me"
    })
  };

  if (request.session.pendingLogin !== true){
    return reply.send({
      success: false,
      error: "Please login first! Redirecting...",
      redirect: "/auth/signin"
    });
  };
  try {
    const email = request.session.pendingLoginEmail;
    const code = crypto.randomInt(100000, 999999).toString();
    await createCode({
      email: email,
      loginCode: code,
      expiresAt: new Date(Date.now() + (60 * 5 * 1000)),
      type: "login"
    });
    await sendVerificationCode(email, code);
    return reply.send({
      success: true
    });
  } catch (error){
    console.log(error);
    return reply.send({
      success: false,
      error: error.message || "Internal error while resending the code. Please try again later!"
    });
  };
});


fastify.post('/auth/verify', async (request, reply) => {
  if (request.session.user){
    return reply.send({
      success: false,
      error: "Already Logged-In! Redirecting to dashboard...",
      redirect: "/me"
    })
  };
  if (request.session.pendingLogin !== true){
    return reply.send({
      success: false,
      error: "Please login first! Redirecting...",
      redirect: "/auth/signin"
    });
  };
  const { otp } = request.body;
  if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)){
    return reply.send({
      success: false,
      error: "Please enter a valid 6-digit OTP"
    });
  };

  try {
    
  const code = await getCodeBy({
    email: request.session.pendingLoginEmail,
    loginCode: otp,
    type: "login"
  });
  if (!code){
    return reply.send({
      success: false,
      error: "Invalid or expired OTP. Please request for a new one!"
    });
  };

  const user = await getUserBy({
    email: code.email
  });
  if (!user){
    return reply.send({
      success: false,
      error: "Invalid OTP. Please try again!"
    });
  };
  if (user.activated === false){
    return reply.send({
      success: false,
      error: "Please activate your account first!"
    });
  };
  await updateUser({_id: user._id}, {$set: {
    lastLogin: Date.now()
  }});
  delete request.session.pendingLoginEmail;
  delete request.session.pendingLogin;
  request.session.user = user._id;
  await deleteCode({_id: code._id});
  return reply.send({
    success: true,
    go_to: "/me"
  });
  } catch (error){
    console.log(error);
    return reply.send({
      success: false,
      error: error.message || "Internal error while verifying your login. Please try again later!"
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


fastify.post('/auth/signup', async (request, reply) => {
  try {

  let { email, phone, password, token, c } = request.body;
  let signupWith = "email";

  if (!c && (!email || !phone || !password, !token)){
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
      
      const isHuman = await verify(process.env.HCAPTCHA_SECRET, token);
      
      if (!isHuman.success){
        return reply.send({
          success: false,
          error: "Please complete the captcha!"
        });
      };

      if (isHuman.hostname !== "replit.dev" && isHuman.hostname !== "localhost"){
        return reply.send({
          success: false,
          error: "Invalid captcha. Please try again!"
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
        signupWith,
        role: "user",
        signedupAt: Date.now(),
        lastLogin: null
      };
    
    if (signupWith === "email"){
      activationCode = uuidv4();
      createObj.activationCode = activationCode;
        createObj.activationCodeExpires = Date.now() + (60 * 30 * 1000);
      createObj.linkResent = 0;
        createObj.email = email;
        createObj.phone = phone;
        createObj.password = password;
        createObj.picture = "/assets/profiles/default-profile.png";
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
      error: error.message || "Internal error while signing up. Please try again later!"
    });
  };
});


fastify.post('/auth/signin', async (request, reply) => {
  try {

  let { email, password, token, c } = request.body;
  let signinWith = "email";

  if (!c && (!email || !password, !token)){
    return reply.send({
      success: false,
      error: "Please fill in all fields"
    });
  };
  if (c) signinWith = "google";

  if (signinWith === "email"){

  if (!email || email.length < 5 || !email.includes('@') || !email.includes('.')){
    return reply.send({
      success: false,
      error: "Please enter a valid email address!"
    });
  };
  
  if (!password || password.length < 8){
    return reply.send({
      success: false,
      error: "Password must be at least 8 characters long!"
    });
  };

      const isHuman = await verify(process.env.HCAPTCHA_SECRET, token);

      if (!isHuman.success){
        return reply.send({
          success: false,
          error: "Please complete the captcha!"
        });
      };

      if (isHuman.hostname !== "replit.dev" && isHuman.hostname !== "localhost"){
        return reply.send({
          success: false,
          error: "Invalid captcha. Please try again!"
        });
      };

  };

  let googleId = null;
    
  if (signinWith === "google"){

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

    email = ticket.email;
    googleId = ticket.sub;

  };

    const findWith = {
      $or: [
        { email: email.toLowerCase() }
      ]
    };
    if (googleId) findWith.$or.push({ googleId });

    const user = await getUserBy(findWith);

    if (!user){
      return reply.send({
        success: false,
        error: `Invalid credentials ${ googleId ? '' : '(email or password)' }!`
      });
    };

    if (user.email !== email.toLowerCase()){
      return reply.send({
        success: false,
        error: "Security mismatch: Email does not match account!"
      })
    };

    if (user.signupWith === "email" && signinWith === "google" && googleId){
      await updateUser({_id: user._id}, {
        $set: {
          googleId: googleId
        },
        $unset: {
          activationCode: "",
          activationCodeExpires: "",
          linkResent: ""
        }
      });
    };

  if (user.signupWith === "google" && signinWith === "email" && !user.password){
    return reply.send({
      success: false,
      error: "Please sign in with Google or link password with your Account!"
    });
  };

  if (signinWith === "email"){
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch){
      return reply.send({
        success: false,
        error: "Invalid credentials (email or password)!"
      });
    };
  };

    if (!user.activated){
      if (signinWith === "google"){
        await updateUser({_id: user._id}, {$set: {
          activated: true
        }});
      };

      if (signinWith === "email"){
        const activationCode = uuidv4();
        await updateUser({_id: user._id}, {
          $set: {
            activationCode,
            activationCodeExpires: Date.now() + (60 * 30 * 1000),
          }
        });
        await sendVerificationEmail(user.email, activationCode);
        return reply.send({
          success: false,
          error: "Please check your email for an activation link!"
        });
      };
    };

    if (signinWith === "google"){
      request.session.user = user._id;
      return reply.send({
        success: true,
        go_to: "/me"
      });
    } else {
      const code = crypto.randomInt(100000, 999999).toString();
      await createCode({
        email: user.email,
        loginCode: code,
        expiresAt: new Date(Date.now() + (60 * 5 * 1000)),
        type: "login"
      });
      await sendVerificationCode(user.email, code);
      request.session.pendingLoginEmail = user.email;
      request.session.pendingLogin = true;
      return reply.send({
        success: true
      });
    };

  } catch (error){
    console.log(error);
    return reply.send({
      success: false,
      error: error.message || "Internal error while signing in. Please try again later!"
    });
  };
});














fastify.get('/me', async (request, reply) => {
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
    process.exit(1);
  }
}

start();