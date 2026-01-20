require("dotenv").config();
const Fastify = require("fastify");
const cookie = require("@fastify/cookie");
const session = require("@fastify/session");
const fastifyStatic = require("@fastify/static");
const path = require("path");

const authRoutes = require("./routes/auth.js");

const {
  connectDb,
  getUserBy,
} = require("./db/db.js");

const fastify = Fastify({ logger: false });

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
});
fastify.register(cookie);
fastify.register(session, {
  secret: process.env.SESSION_SECRET || "jsndb$:$$:376hshshdbdbghhghgh7666g",
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
    return reply.redirect("/auth/signin");
  }
  const user = await getUserBy({
    _id: request.session.user,
  });
  if (!user) {
    return reply.redirect("/auth/signin");
  }
  request.user = user;
};

fastify.register(authRoutes, { prefix: "/auth" });

fastify.get("/", async (request, reply) => {
  return reply.sendFile("index.html");
});



fastify.get("/me", async (request, reply) => {
  return reply.sendFile("me/index.html");
});

fastify.get("/logout", async (request, reply) => {
  request.session.destroy();
  return reply.redirect("/auth/signin");
});

const start = async () => {
  try {
    await connectDb();
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log(
      `✅ Server is running on port ${fastify.server.address().port}`,
    );
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

start();