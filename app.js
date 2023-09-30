const express = require("express");
const app = express();
const PORT = process.env.port || 5000;
const mongoose = require("mongoose");
const { mongoUrl } = require("./keys.js");
const cors = require("cors");

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
  pingTimeout: 60000,
  cors: {
    origin: "https://booktrade.onrender.com",
  },
});

const isOnline = new Set();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  //handle user setup
  socket.on("setup", async (userData) => {
    try {
      // Join user to their own room (using their user ID)
      socket.join(userData._id);

      //add user to the set of online users
      isOnline.add(userData._id);

      //broadcast updated online user list to all clients
      io.emit("updateIsOnline", Array.from(isOnline));

      //acknowledge the setup
      socket.emit("connected");
    } catch (error) {
      console.error("Error setting up user:", error);
    }
  });

  //handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

  try {
    //remove user from set online users
    isOnline.delete(socket.id);

    //broadcast updated online user list to all
    io.emit("updateIsOnline", Array.from(isOnline));
  } catch (error) {
    console.log("Error handeling user disconnect:", error);
  }

  socket.on("join chat", (room) => {
    socket.join(room);
    // console.log("User joined room:" + room);
  });

  socket.on("new message", (newMessageReceived) => {
    // console.log("New message received:", newMessageReceived);
    const { chat, sender, content } = newMessageReceived;

    // Check if chat and sender are defined
    if (!chat || !sender || !content) {
      console.log("Invalid message format");
      return;
    }

    // Broadcast the message to all users in the chat except the sender
    socket.to(chat._id).emit("message received", newMessageReceived);
  });

  socket.on("disconnect", () => {
    // console.log("Socket disconnected");
  });
});
 