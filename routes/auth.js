const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const USER = mongoose.model("USER");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { jwt_secret } = require("../keys.js");
const requireLogin = require("../middlewares/requireLogin");

router.get("/", (req, res) => {
  res.send("hello this is booktrade");
});

//random
 
router.post("/signup", (req, res) => {
  const { name, email, collegeName, collegeDegree, year, password } = req.body;

  if (!name) {
    return res.status(422).json({ error: "nameError" });
  } else if (!collegeName) {
    return res.status(422).json({ error: "collegeNameError" });
  } else if (!year) {
    return res.status(422).json({ error: "yearError" });
  } else if (!collegeDegree){
    return res.status(422).json({ error: "collegeDegreeError" });
  }

  USER.findOne({ email: email }).then((savedUser) => {
    if (savedUser) {
      return res.status(422).json({ error: "userError" });
    }
    bcrypt.hash(password, 12).then((hashedPassword) => {
      const user = new USER({
        name,
        email,
        collegeName,
        collegeDegree,
        year,
        password: hashedPassword,
      });

      user
        .save()
        .then((user) => {
          res.json({ message: "Your Account has been created" });
        })
        .catch((err) => {
          console.log(err);
        });
    });
  });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({ error: "OverallError" });
  }
  USER.findOne({ email: email }).then((savedUser) => {
    if (!savedUser) {
      return res.status(422).json({ error: "EmailError" });
    }
    bcrypt
      .compare(password, savedUser.password)
      .then((match) => {
        if (match) {
          // return res.status(200).json({ message: "Loged  in Successfully" });
          const token = jwt.sign({ _id: savedUser.id }, jwt_secret);
          res.json(token);
          // console.log(token);
        } else {
          return res.status(422).json({ error: "PasswordError" });
        }
      })
      .catch((err) => console.log(err));
  });
});

router.get("/loginuser", requireLogin, (req, res) => {
  const userId = req.user._id.toString();
  res.send(userId);
});

router.get("/userdetail", requireLogin, (req, res) => {
  USER.findById(req.user._id)
    .select("name email profilePic year collegeName collegeDegree _id")
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    });
});

router.get("/readinglist", requireLogin, (req, res) => {
  USER.findById(req.user._id)
    .select("readingList")
    .then((user) => {
      if (!user) {
        return res.status(500).json({ error: "User not found" });
      }
      res.json({ readingList: user.readingList });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    });
});

router.delete("/readinglist/:itemIndex", requireLogin, (req, res) => {
  const itemIndex = parseInt(req.params.itemIndex);
  const userId = req.user._id;

  USER.findById(userId)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if the itemIndex is within bounds
      if (itemIndex < 0 || itemIndex >= user.readingList.length) {
        return res.status(400).json({ error: "Invalid item index" });
      }

      // Remove the item at the specified index
      const removedItem = user.readingList.splice(itemIndex, 1);

      // Save the updated user document
      user
        .save()
        .then(() => {
          res.json({ success: true });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: "Internal server error" });
        });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    });
});

router.put("/changepassword", requireLogin, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(422)
      .json({ error: "Both current and new passwords are required" });
  }

  // Find the user by their ID
  USER.findById(req.user._id)
    .then((savedUser) => {
      if (!savedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify the current password
      bcrypt
        .compare(currentPassword, savedUser.password)
        .then((isMatch) => {
          if (!isMatch) {
            return res.status(422).json({ error: "Invalid current password" });
          }

          // Hash the new password
          bcrypt
            .hash(newPassword, 12)
            .then((hashedPassword) => {
              // Update the user's password
              savedUser.password = hashedPassword;
              savedUser
                .save()
                .then(() => {
                  res.json({ message: "Password updated successfully" });
                })
                .catch((err) => {
                  console.error(err);
                  res.status(500).json({ error: "Internal server error" });
                });
            })
            .catch((err) => {
              console.error(err);
              res.status(500).json({ error: "Internal server error" });
            });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ error: "Internal server error" });
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

router.put("/editprofile", requireLogin, (req, res) => {
  const { name, email, collegeName, collegeDegree, year } = req.body;
  const userId = req.user._id;

  // You can add additional validation here if needed

  // Find the user by their ID
  USER.findById(userId)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update user details
      user.name = name;
      user.email = email;
      user.collegeName = collegeName;
      user.collegeDegree = collegeDegree;
      user.year = year;

      // Save the updated user document
      user
        .save()
        .then(() => {
          res.json({ message: "User details updated successfully" });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: "Internal server error" });
        });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    });
});

router.put("/uploadProfilePic", requireLogin, async (req, res) => {
  try {
    const userId = req.user._id;
    const { pic } = req.body;

    // Find the user by ID
    const user = await USER.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the user's profilePic field
    user.profilePic = pic;
    await user.save();

    // console.log("Updated User:", user);

    // Return the updated user with the new profile picture URL
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Define a new GET route to fetch college names
// router.get("/colleges", (req, res) => {
//   // Query your database to retrieve a list of college names
//   USER.find({}, "collegeName", (err, users) => {
//     if (err) {
//       console.error(err);
//       return res.status(500).json({ error: "Internal server error" });
//     }

//     // Extract college names from user documents
//     const collegeNames = users.map((user) => user.collegeName);

//     // Remove duplicates and sort alphabetically (optional)
//     const uniqueCollegeNames = [...new Set(collegeNames)].sort();

//     // Send the list of college names as a JSON response
//     res.json({ collegeNames: uniqueCollegeNames });
//   });
// });

router.get("/colleges", async (req, res) => {
  try {
    // Query your database to retrieve a list of college names
    const users = await USER.find({}, "collegeName");

    // Extract college names from user documents
    const collegeNames = users.map((user) => user.collegeName);

    // Remove duplicates and sort alphabetically (optional)
    const uniqueCollegeNames = [...new Set(collegeNames)].sort();

    // Send the list of college names as a JSON response
    res.json({ collegeNames: uniqueCollegeNames });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Define a new PUT route to update the notificationCheck field
router.put("/updateNotificationCheck", requireLogin, (req, res) => {
  const userId = req.user._id;

  // You can specify the new date and time value to save
  const newNotificationCheckDate = new Date(); // This will use the current date and time

  // Find the user by their ID
  USER.findById(userId)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update the user's notificationCheck field
      user.notificationCheck = newNotificationCheckDate;

      // Save the updated user document
      user
        .save()
        .then(() => {
          res.json({ message: "Notification check updated successfully" });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: "Internal server error" });
        });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    });
});

// Define a new GET route to retrieve the notificationCheck value
router.get("/getNotificationCheck", requireLogin, (req, res) => {
  const userId = req.user._id;

  // Find the user by their ID
  USER.findById(userId)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Retrieve and send the user's notificationCheck value
      const notificationCheck = user.notificationCheck;
      res.json({ notificationCheck });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    });
});

router.put("/makeOnline", requireLogin, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find the user by ID
    const user = await USER.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the user's profilePic field
    user.isOnline = true;
    await user.save();

    // console.log("Updated User:", user);

    // Return the updated user with the new profile picture URL
    res.json(user.isOnline);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error d" });
  }
});

router.put("/makeOffline", requireLogin, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find the user by ID
    const user = await USER.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the user's profilePic field
    user.isOnline = false;
    await user.save();

    // console.log("Updated User:", user);

    // Return the updated user with the new profile picture URL
    res.json(user.isOnline);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error d" });
  }
});

 

module.exports = router;
