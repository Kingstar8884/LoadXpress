const { ObjectId } = require("mongodb");
const { getUserBy } = require("../db/db.js");

const meRoutes = async (fastify, options) => {

  const { authenticate } = options;

  const validateUser = async (request, reply) => {

    const _id = request.session.user;

    if (!ObjectId.isValid(_id)) {
      await request.session.destroy();
      return reply.redirect("/auth/signin");
    };
    
    const user = await getUserBy({
      _id: new ObjectId(_id)
    });
    
    if (!user) {
      await request.session.destroy();
      return reply.redirect("/auth/signin");
    };
    
    request.user = user;
  };

  fastify.get("/", { preHandler: [authenticate, validateUser] } , async (request, reply) => {
    return reply.view("index.ejs", {
      user: request.user
    });
  });
  
};

module.exports = meRoutes;