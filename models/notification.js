const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const notificationSchema = new mongoose.Schema({
  bookId: {
    type: ObjectId,
    ref: "POST",
  },
  senderId: {
    type: ObjectId,
    ref: "USER",
  },
  ownerId: {
    type: ObjectId,
    ref: "USER",
  },
  request: {
    type: String,
  },
  respondBookId: {
    type: ObjectId,
    ref: "POST",
  },
  status: {
    type: String,
  },
  confirmId: {
    type: ObjectId,
    ref: "USER",
  },
},
{
  timestamps: true,
});

mongoose.model("NOTIFICATION", notificationSchema);
