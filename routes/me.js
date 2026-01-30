const { ObjectId } = require("mongodb");
const { getUserBy } = require("../db/db.js");


const plans = {
  airtel: {
    id: 3,
    data: [
      {
        id: 13,
        size: "500MB",
        duration: "7 days",
        price: 500,
        resellerPrice: 495,
        apiPrice: 490
      },
      {
        id: 14,
        size: "1.5GB",
        duration: "2 days",
        price: 650,
        resellerPrice: 600,
        apiPrice: 599
      },
      {
        id: 15,
        size: "1GB",
        duration: "7 days",
        price: 800,
        resellerPrice: 790,
        apiPrice: 785
      },
      {
        id: 17,
        size: "2GB",
        duration: "30 days",
        price: 1500,
        resellerPrice: 1485,
        apiPrice: 1470
      },
      {
        id: 18,
        size: "3GB",
        duration: "30 days",
        price: 2100,
        resellerPrice: 1999,
        apiPrice: 1960
      },
      {
        id: 19,
        size: "4GB",
        duration: "30 days",
        price: 2650,
        resellerPrice: 2599,
        apiPrice: 2570
      },
      {
        id: 20,
        size: "8GB",
        duration: "30 days",
        price: 3200,
        resellerPrice: 3100,
        apiPrice: 2999
      },
      {
        id: 21,
        size: "10GB",
        duration: "30 days",
        price: 4200,
        resellerPrice: 4099,
        apiPrice: 4070
      }
    ]
  },

  glo: {
    id: 2,
    data: [
      {
        id: 42,
        size: "200MB",
        duration: "1 day",
        price: 100,
        resellerPrice: 95,
        apiPrice: 89
      },
      {
        id: 35,
        size: "500MB",
        duration: "30 days",
        price: 250,
        resellerPrice: 230,
        apiPrice: 225
      },
      {
        id: 36,
        size: "1GB",
        duration: "30 days",
        price: 450,
        resellerPrice: 430,
        apiPrice: 425
      },
      {
        id: 40,
        size: "2GB",
        duration: "30 days",
        price: 900,
        resellerPrice: 850,
        apiPrice: 840
      },
      {
        id: 38,
        size: "5GB",
        duration: "30 days",
        price: 2250,
        resellerPrice: 2199,
        apiPrice: 2190
      },
      {
        id: 39,
        size: "10GB",
        duration: "30 days",
        price: 4500,
        resellerPrice: 4399,
        apiPrice: 4390
      }
    ]
  },

  mtn: {
    id: 1,
    data: [
      {
        id: 43,
        size: "110MB",
        duration: "1 day",
        price: 100,
        resellerPrice: 99,
        apiPrice: 99
      },
      {
        id: 44,
        size: "500MB",
        duration: "30 days",
        price: 400,
        resellerPrice: 390,
        apiPrice: 385
      },
      {
        id: 46,
        size: "1GB",
        duration: "30 days",
        price: 570,
        resellerPrice: 560,
        apiPrice: 560
      },
      {
        id: 48,
        size: "2GB",
        duration: "30 days",
        price: 1250,
        resellerPrice: 1199,
        apiPrice: 1150
      },
      {
        id: 49,
        size: "3GB",
        duration: "30 days",
        price: 1500,
        resellerPrice: 1399,
        apiPrice: 1370
      },
      {
        id: 50,
        size: "5GB",
        duration: "30 days",
        price: 2300,
        resellerPrice: 2099,
        apiPrice: 2050
      },
      {
        id: 57,
        size: "36GB",
        duration: "30 days",
        price: 11000,
        resellerPrice: 10900,
        apiPrice: 10800
      },
      {
        id: 51,
        size: "75GB",
        duration: "30 days",
        price: 18500,
        resellerPrice: 17999,
        apiPrice: 17990
      }
    ]
  }
};

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
    return reply.view("index", {
      user: request.user
    });
  });


  fastify.get("/order", { preHandler: [authenticate, validateUser] } , async (request, reply) => {
    return reply.view("order", {
      user: request.user
    });
  });
  
};

module.exports = meRoutes;