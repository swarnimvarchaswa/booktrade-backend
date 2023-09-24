const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const chatSchema = new mongoose.Schema({
  ChatName: {
    type: String,
  },
  users: [
    {
      type: ObjectId,
      ref: "USER",
    },
  ],
  latestMessage: {
    type: ObjectId,
    ref: "MESSAGE",
    // type: String
  },
},
{
  timestamps: true,
});

mongoose.model("CHAT", chatSchema);
