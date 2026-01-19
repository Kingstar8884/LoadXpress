const userSchema = {
  uuid: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
     type: String,
     required: true,
     unique: true,
  },
  password: {
     type: String,
     required: true
  },
  createdAt: {
     type: Date,
     default: Date.now()
  },
  balance: {
     type: Number,
     default: 0.00
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  history: {
    type: Array,
    default: []
  }
};





module.exports = {
   userSchema
};