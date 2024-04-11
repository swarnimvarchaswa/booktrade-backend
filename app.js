const express = require("express");
const app = express();
// const PORT = process.env.port || 5000;
const PORT = process.env.port
const mongoose = require("mongoose");
const { mongoUrl } = require("./keys.js");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const USER = require("./models/model.js");

app.use(cors());
require("./models/model");
require("./models/post");
require("./models/notification");
require("./models/chatModel");
require("./models/message");

app.use(express.json());
app.use(require("./routes/auth"));
app.use(require("./routes/addBook"));
app.use(require("./routes/notification"));
app.use(require("./routes/chat"));
app.use(require("./routes/message"));

mongoose.connect(mongoUrl);

mongoose.connection.on("connected", () => {
  console.log("successfully connected to mongodb");
});

mongoose.connection.on("error", () => {
  console.log("not connected to mongodb");
}); //.env

// codium.AI
//socket.io

const server = app.listen(PORT, () => {
  console.log("server is running on " + PORT);
});

const io = require("socket.io")(server, {
  pingTimeout: 300000,
  cors: {
    origin: "https://booktrade.onrender.com",
    // origin: "http://localhost:3000",
  },
});

const activeChats = new Set();

io.on("connection", async (socket) => {
  console.log("User connected:", socket.id); //11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111
  // console.log("User connected socket:", socket);

  // console.log(socket.handshake.auth.token);
  const userId = socket.handshake.auth.token;

  await USER.findByIdAndUpdate(
    { _id: userId },
    { $set: { isOnline: true }}
  ).exec();

  //user broadcast online status

  socket.broadcast.emit("getOnlineUser", { user_id: userId });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User joined room:" + room); //111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111
    // console.log(socket);

    activeChats.add(room);
  });

  socket.on("leave chat", (room) => {
    socket.leave(room);
    console.log("User left room:" + room); //22222222222222222222222222222222222222222222222222222222222222222222222222222222222222

    activeChats.delete(room);
  });

  socket.on("new message", (newMessageReceived) => {
    // console.log("New message received:", newMessageReceived);
    const { chat, sender, content } = newMessageReceived;

    // Check if chat and sender are defined
    if (!chat || !sender || !content) {
      console.log("Invalid message format");
      return;
    }

    // Generate a unique message ID (you can use a library like uuid)
    // const messageId = uuidv4();

    // Broadcast the message to all users in the chat except the sender                           { except: [socket.id, chat._id] }

    socket.to(chat._id).emit("message received", newMessageReceived);

    // Broadcast the message to all connected sockets except the sender
    console.log(activeChats)
    console.log(newMessageReceived.chat._id)

    if (!activeChats.has(newMessageReceived.chat._id)) {
      socket.broadcast.emit("new notification", newMessageReceived);
    }
  });

  socket.on("disconnect", async function () {
    console.log("Socket disconnected");

    var userId = socket.handshake.auth.token;

    await USER.findByIdAndUpdate(
      { _id: userId },
      { $set: { isOnline: false } }
    ).exec();

    //user broadcast offline status
    socket.broadcast.emit("getOfflineUser", { user_id: userId });
  });
});
