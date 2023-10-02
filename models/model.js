const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  profilePic: {
    type: String,
    default:
      "https://res.cloudinary.com/booktrade/image/upload/v1694354727/default-avatar-profile-icon-vector-social-media-user-photo-700-205577532_yzne6o.jpg",
  },
  email: {
    type: String,
    required: true,
  },
  collegeName: {
    type: String,
    required: true,
  },
  collegeDegree: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  readingList: [
    {
      type: String,
    },
  ],
  notificationCheck: {
    type: Date,
  },
  isOnline: {
    type: Boolean,
    default: false
  }
});

// mongoose.model("USER", userSchema);
const USER = mongoose.model("USER", userSchema);

module.exports = USER;
