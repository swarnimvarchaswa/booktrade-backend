const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const USER = mongoose.model("USER");
const jwt = require("jsonwebtoken");
const { jwt_secret } = require("../keys.env");
const requireLogin = require("../middlewares/requireLogin");
const MESSAGE = mongoose.model("MESSAGE");
const CHAT = mongoose.model("CHAT");
const moment = require("moment");

// GET request to retrieve messages in a chat
// router.get("/message/:chatId", requireLogin, async (req, res) => {
//     try {
//       const chatId = req.params.chatId;
//       // Fetch all messages in the specified chat
//       const messages = await MESSAGE.find({ chat: chatId }).populate("sender", "_id");
//       res.json({ messages });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   });

//for delete messages
// GET request to retrieve messages in a chat

router.get("/message/:chatId", requireLogin, async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const userId = req.user._id;

    // Cleanup: Delete messages older than 24 hours
    const twentyFourHoursAgo = moment().subtract(24, "hours");
    await MESSAGE.deleteMany({
      chat: chatId,
      isRead: true,
      updatedAt: { $lt: twentyFourHoursAgo },
    });

    // Fetch all messages in the specified chat
    const messages = await MESSAGE.find({ chat: chatId }).populate(
      "sender",
      "_id"
    );

    await MESSAGE.updateMany(
      { chat: chatId, sender: { $ne: userId }, isRead: false },
      { $set: { isRead: true }}
    )
    res.json({ messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//for 30 days
// router.get("/message/:chatId", requireLogin, async (req, res) => {
//   try {
//     const chatId = req.params.chatId;

//     // Calculate the date 30 days ago using Moment.js
//     const thirtyDaysAgo = moment().subtract(30, "days");

//     // Cleanup: Delete messages older than 30 days
//     await MESSAGE.deleteMany({
//       chat: chatId,
//       createdAt: { $lt: thirtyDaysAgo },
//     });

//     // Fetch all messages in the specified chat
//     const messages = await MESSAGE.find({ chat: chatId }).populate(
//       "sender",
//       "_id"
//     );
//     res.json({ messages });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });


// POST request to send a new message

router.post("/message", requireLogin, async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const sender = req.user._id; // The user sending the message

    // Create a new message
    const newMessage = new MESSAGE({
      sender,
      content,
      chat: chatId,
    });

    // Save the message to the database
    const savedMessage = await newMessage.save();
    // const messageID = savedMessage._id;

    // Print the message ID to the console
    console.log("Saved Message ID:", savedMessage.content);

    // Update the latestMessage field in the chat document with the message ID
    await CHAT.findByIdAndUpdate(
      chatId,
      { $set: { latestMessage: savedMessage.content  } },
      { new: true }
    );

    res.json({ message: savedMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
