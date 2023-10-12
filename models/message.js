const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: ObjectId,
      ref: "USER",
    },
    content: {
      type: String,
    },
    chat: {
      type: ObjectId,
      ref: "CHAT",
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

mongoose.model("MESSAGE", messageSchema);
