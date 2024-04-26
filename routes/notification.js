const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const USER = mongoose.model("USER");
// const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { jwt_secret } = require("../keys.env");
const requireLogin = require("../middlewares/requireLogin");
const POST = mongoose.model("POST");
const NOTIFICATION = mongoose.model("NOTIFICATION");
const moment = require("moment");

router.get("/notification", requireLogin, async (req, res) => {
  try {
    // Calculate the date from three months ago
    const threeMonthsAgo = moment().subtract(3, "months").toDate();

    // Fetch and delete notifications older than three months for the currently logged-in user (receiverId)
    await NOTIFICATION.deleteMany({
      $or: [{ ownerId: req.user._id }, { senderId: req.user._id }],
      updatedAt: { $lt: threeMonthsAgo }, // Filter notifications older than three months
    });

    // Fetch notifications for the currently logged-in user (receiverId)
    const notifications = await NOTIFICATION.find({
      $or: [{ ownerId: req.user._id }, { senderId: req.user._id }],
    })
      .sort({ updatedAt: -1 })
      .populate("bookId", "bookName") // Populate book information
      .populate("ownerId", "name") // Populate sender information
      .populate("senderId", "name")
      .populate("respondBookId", "bookName");

    res.json({ notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// router.get("/notification", requireLogin, async (req, res) => {
//   try {
//     // Fetch notifications for the currently logged-in user (receiverId)
//     const notifications = await NOTIFICATION.find({
//       $or: [{ ownerId: req.user._id }, { senderId: req.user._id }],
//     })
//       // .sort({ _id: -1 })
//       .sort({ updatedAt: -1 })
//       .populate("bookId", "bookName") // Populate book information
//       .populate("ownerId", "name") // Populate sender information
//       .populate("senderId", "name")
//       .populate("respondBookId", "bookName");

//     res.json({ notifications });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// Route to create a new exchange notification
router.post("/notification", requireLogin, async (req, res) => {
  try {
    const { bookId, ownerId, request } = req.body;

    // Create a new exchange notification with status set to 'pending'
    const newNotification = new NOTIFICATION({
      bookId: bookId,
      ownerId: ownerId,
      senderId: req.user._id,
      status: "pending",
      request: request,
    });
    await newNotification.save();
    res
      .status(201)
      .json({ message: "Exchange notification created successfully" }); // 201 status for resource creation
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//route to manage notification
router.put("/notification", requireLogin, async (req, res) => {
  try {
    const {
      notificationId,
      newStatus,
      newRespondBookId,
      newRequest,
      newConfirmId,
    } = req.body; // Get notificationId, newStatus, and newRespondBookId from the request body

    // Find the notification by ID
    const notification = await NOTIFICATION.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check if the user making the request is the owner of the notification
    if (notification.ownerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to update this notification" });
    }

    // Update the notification with the new status and newRespondBookId
    notification.status = newStatus;
    notification.respondBookId = newRespondBookId;
    notification.request = newRequest;
    notification.confirmId = newConfirmId;

    await notification.save();

    res.json({ message: "Notification updated successfully", notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/exchange", requireLogin, async (req, res) => {
  try {
    const { notificationId, newStatus, newConfirmId } = req.body; // Get notificationId, newStatus, and newRespondBookId from the request body

    // Find the notification by ID
    const notification = await NOTIFICATION.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check if the user making the request is the owner of the notification
    if (
      notification.ownerId.toString() !== req.user._id.toString() &&
      notification.senderId.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ error: "You are not authorized to update this notification" });
    }

    // Update the notification with the new status and newRespondBookId
    notification.status = newStatus;
    notification.confirmId = newConfirmId;

    await notification.save();

    res.json({ message: "Notification updated successfully", notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/exchangebook", requireLogin, async (req, res) => {
  try {
    const { notificationId } = req.body; // Get notificationId from the request body
    const {loggedIn} = req.user._id;

    // Find the notification by ID
    const notification = await NOTIFICATION.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check if the user making the request is one of the owners involved in the exchange
    if (
      notification.ownerId.toString() !== req.user._id.toString() &&
      notification.senderId.toString() !== req.user._id.toString() &&
      notification.status === "exchange"
    ) {
      return res
        .status(403)
        .json({ error: "You are not authorized to update this notification" });
    }

    // Check if the notification status is 'confirm' (both owners have confirmed)
    if (notification.status !== "confirm") {
      return res.status(400).json({ error: "Exchange not confirmed yet" });
    }

    // Assuming you have a "POST" model for books
    const book = await POST.findById(notification.bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    // Update the owner of the book to the sender of the exchange
    book.postedBy = notification.senderId;
    // Save the updated book
    await book.save();

    const resbook = await POST.findById(notification.respondBookId);
    if (!resbook) {
      return res.status(404).json({ error: "Book not found" });
    }
    // Update the owner of the book to the sender of the exchange
    resbook.postedBy = notification.ownerId;
    // Save the updated book
    await resbook.save();

    // Update the notification status to 'completed' to mark the exchange as completed
    // notification.status = "completed";
    await notification.save();

    res.json({ message: "Book exchange completed successfully", notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
