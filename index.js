require("dotenv").config();
const Fastify = require("fastify");
const cookie = require("@fastify/cookie");
const session = require("@fastify/session");
const fastifyStatic = require("@fastify/static");
const fastifyView = require("@fastify/view");
const { MongoStore } = require("connect-mongo");
const { ObjectId } = require("mongodb");
const ejs = require("ejs");
const path = require("path");

const authRoutes = require("./routes/auth.js");
const dashboardRoutes = require("./routes/me.js");

const { buyAirtime } = require("./utils/orders.js");

const {
  connectDb,
  addTransaction,
  getTransactions
} = require("./db/db.js");

const fastify = Fastify({ logger: false });

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
});
fastify.register(cookie);
fastify.register(session, {
  secret: process.env.SESSION_SECRET || "jsndb$:$$:3jsndb$:$$:3jsndb$:$$:3",
  cookie: {
    secure: false,
    maxAge: 60 * 60 * 1000,
    httpOnly: true
  },
  saveUninitialized: false,
  resave: false,
  store: new MongoStore({
    mongoUrl: process.env.MONGO_URI,
    ttl: 60 * 60,
  })
});


fastify.register(fastifyView, {
  engine: {ejs},
  root: path.join(__dirname, "views"),
});


const authenticate = async (request, reply) => {
  if (!request.session.user) {
    return reply.redirect("/auth/signin");
  };
};

fastify.register(authRoutes, { prefix: "/auth" });
fastify.register(dashboardRoutes, {
  prefix: "/me",
  authenticate
});

fastify.get("/", async (request, reply) => {
  return reply.sendFile("index.html");
});




fastify.get("/api/get-transactions", { preHandler: authenticate}, async (request, reply) => {
  try {
    const details = await getTransactions(new ObjectId(request.session.user));
    return reply.send({
      success: true,
      details
    });
  } catch (error){
    console.log(error);
    return reply.send({
      success: false,
      error: "Internal error while fetching transactions. Please try again later!"
    });
  };
});



fastify.post("/api/order", {preHandler: authenticate}, async (request, reply) => {

  const { phone, service, network, pin, amount, planId } = request.body;

  if (!phone || !/^\d{10,11}$/.test(phone) || !service || !network || !pin || pin.length !== 4 || (!amount && !planId)){
    return reply.send({
      success: false,
      error: "Bad request!"
    });
  };

  if (service === 'airtime') {
    if (!amount || isNaN(amount) || Number(amount) < 50) {
      return reply.send({
        success: false,
        error: "Bad request!"
      });
    };
  } else {
    if (!dataSelect) {
      return reply.send({
        success: false,
        error: "Bad request!"
      });
    };
  };

  return reply.send({
    success: true
  });

});





fastify.get("/logout", (request, reply) => {
  request.session.destroy(err => {
    if (err) {
      console.error(err);
      return reply.code(500).send("Failed to logout");
    };
    reply.redirect("/auth/signin");
  });
});


const start = async () => {
  try {
    await connectDb();
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log(
      `✅ Server is running on port ${fastify.server.address().port}`,
    );

    /*
    console.log(await addTransaction({
      userId: new ObjectId("696fc6d071eccae4db17bbcd"),
      amount: 500,
      type: "vtu",
      which: "9m",
      status: "completed",
      description: "Test transaction",
      sub: "9 Mobile Airtime",
      subInfo: "09145783421",
      debit: true,
      createdAt: new Date()
    }));
*/
    
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

start();