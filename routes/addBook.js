const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const requireLogin = require("../middlewares/requireLogin");
const POST = mongoose.model("POST");
const USER = mongoose.model("USER");
const moment = require('moment');

router.get("/allposts", requireLogin, (req, res) => {
  USER.findById(req.user._id)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const usercollegeName = user.collegeName;

      if (!usercollegeName) {
        return res.status(400).json({ error: "User collegeName not found" });
      }

      POST.find()
        .sort({ _id: -1 })
        .populate("postedBy", "_id name collegeName")
        .then(async (posts) => {
          const currentDate = moment().startOf('day'); // Get the current date at the start of the day

          // Iterate through the posts and update availability based on availabledate
          for (const post of posts) {
            const postDate = moment(post.availabledate).startOf('day'); // Start of the day for post's availabledate
            if (postDate.isSameOrBefore(currentDate)) {
              // If postDate is today or in the past, set availability to "available"
              post.availability = "Available";
            }
          }

          // Save the updated posts
          try {
            await Promise.all(posts.map((post) => post.save()));
            // console.log("Availability updated successfully.");
          } catch (err) {
            console.error("Error updating availability:", err);
          }

          // Filter posts based on collegeName
          const filteredPosts = posts.filter((post) => post.postedBy.collegeName === usercollegeName);

          res.json(filteredPosts);
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: "server error" });
        });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    });
});

router.get("/detail/:id", (req, res) => {
  POST.findOne({ _id: req.params.id })
    .populate("postedBy", "_id name profilePic")
    .then((book) => {
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(book);
    })
    .catch((err) => {
      console.error(err); // Log the error for debugging
      res.status(500).json({ error: "Internal server error" });
    });
});

router.post("/addbook", requireLogin, (req, res) => {
  const { bookName, authorName, pic, bookCondition, bookCoverColor } = req.body;
  if (!bookName || !authorName || !pic || !bookCondition || !bookCoverColor) {
    if (!bookName) {
      return res.status(422).json({ error: "bookNameError" });
    } else if (!authorName) {
      return res.status(422).json({ error: "authorNameError" });
    } else if (!pic) {
      return res.status(422).json({ error: "picError" });
    } else if (!bookCondition) {
      return res.status(422).json({ error: "bookConditionError" });
    } else if (!bookCoverColor) {
      return res.status(422).json({ error: "bookCoverColorError" });
    }
    // return res.status(422).json({ eror: "Please add all the fields" });
  }
  req.user;
  const post = new POST({
    bookName,
    authorName,
    bookCover: pic,
    bookCondition,
    bookCoverColor,
    postedBy: req.user,
  });
  post
    .save()
    .then((result) => {
      return res.json({ post: result });
    })
    .catch((err) => console.log(err));
});

router.get("/editbook/:id", requireLogin, (req, res) => {
  const postId = req.params.id;

  POST.findOne({ _id: postId })
    .then((book) => {
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      // Check if the logged-in user is the owner of the book
      if (book.postedBy.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ error: "You are not authorized to edit this book" });
      }

      // Return the book details for editing
      res.json(book);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

// Edit Book Details Route - POST Request
router.post("/editbook/:id", requireLogin, (req, res) => {
  const postId = req.params.id;
  const { bookName, authorName, bookCondition, bookCoverColor } = req.body;

  // Validate the request body
  if (!bookName || !authorName || !bookCondition || !bookCoverColor) {
    return res.status(422).json({ error: "Please fill in all the fields" });
  }

  POST.findOne({ _id: postId })
    .then((book) => {
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      // Check if the logged-in user is the owner of the book
      if (book.postedBy.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ error: "You are not authorized to edit this book" });
      }

      // Update the book details
      book.bookName = bookName;
      book.authorName = authorName;
      book.bookCondition = bookCondition;
      book.bookCoverColor = bookCoverColor;

      // Save the updated book
      book
        .save()
        .then((result) => {
          res.json({
            message: "Book details updated successfully",
            book: result,
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

router.delete("/deletebook/:id", requireLogin, (req, res) => {
  const postId = req.params.id;
  POST.findById(postId)
    .then((book) => {
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      if (book.postedBy.toString() !== req.user._id.toString()) {
        // User is not authorized to delete this book, return a 403 error
        return res
          .status(403)
          .json({ error: "You are not authorized to delete this book" });
      }
      // if (!book.postedBy.equals(requestingUserId)) {  //line 104
      //   return res.status(403).json({ error: "You are not authorized to delete this book" });
      // }

      // Remove the book
      POST.findByIdAndRemove(postId)
        .then(() => {
          res.json({ message: "Book deleted successfully" });
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

router.get("/myposts", requireLogin, (req, res) => {
  POST.find({ postedBy: req.user._id })
    .sort({ _id: -1 })
    .populate("postedBy", "_id name")
    .then((myposts) => {
      res.json(myposts);
    });
});

router.post("/addreadinglist", requireLogin, (req, res) => {
  const { readinglist } = req.body;

  if (!readinglist) {
    return res.status(422).json({ error: "Please provide a book name" });
  }
  req.user.readingList.push(readinglist);

  req.user
    // any mistake here
    .save()
    .then((user) => {
      return res.json({ message: "Book added to reading list", user });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    });
});

router.get("/postsByUserReadingList", requireLogin, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch the readingList array from the logged-in user's account
    const user = await USER.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const readingList = user.readingList || [];

    if (readingList.length === 0) {
      return res.status(400).json({ error: "User's reading list is empty" });
    }

    // Get the collegeName of the authenticated user
    const usercollegeName = user.collegeName;

    // Find users with the same collegeName
    const usersInSamecollege = await USER.find({
      collegeName: usercollegeName,
    });

    // Get the user IDs of users in the same college
    const userIDsInSamecollege = usersInSamecollege.map((u) => u._id);

    // Convert all book names in the readingList to lowercase for case-insensitive comparison
    const lowerCaseReadingList = readingList.map((name) => name.toLowerCase());

    // Find posts where the 'bookName' field matches any of the book names in the readingList
    // and posted by users in the same college
    const myPosts = await POST.find({
      bookName: {
        $in: lowerCaseReadingList.map((name) => new RegExp(name, "i")),
      },
      postedBy: {
        $in: userIDsInSamecollege,
      },
    })
      .sort({ _id: -1 })
      .populate("postedBy", "_id name")
      .exec();

    res.json(myPosts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/user/:id", requireLogin, async (req, res) => {
  try {
    const user = await USER.findOne({ _id: req.params.id }).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const posts = await POST.find({ postedBy: req.params.id })
      .sort({ _id: -1 })
      .populate("postedBy", "_id");

    // Fetch the reading list data from the user object
    const readingList = user.readingList;

    res.status(200).json({ user, posts, readingList });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/availability/:id", requireLogin, (req, res) => {
  const postId = req.params.id;

  POST.findOne({ _id: postId }).then((book) => {
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Check if the logged-in user is the owner of the book
    if (book.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "You are not authorized to update this book's availability",
      });
    }

    book.availability =
      book.availability === "Available" ? "Unavailable" : "Available";

    book
      .save()
      .then((updatedBook) => {
        res.json({
          message: "Availability toggled successfully",
          book: updatedBook,
        });
      })
      .catch((error) => {
        res.status(500).json({ error: "Error saving the updated book" });
      });
  });
});

//manage available date
router.get("/availabledate/:id", requireLogin, (req, res) => {
  const bookId = req.params.id;

  POST.findOne({ _id: bookId })
    .then((book) => {
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      // You can send the counter value as a response
      res.json(book.availabledate);
    })
    .catch((error) => {
      res.status(500).json({ error: "Error retrieving the counter" });
    });
});

router.put("/availabledate/:id", requireLogin, (req, res) => {
  const bookId = req.params.id;
  const { counter } = req.body;

  POST.findOne({ _id: bookId })
    .then((book) => {
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      // Update the counter value
      book.availabledate = counter;

      // Save the updated book
      book
        .save()
        .then((updatedBook) => {
          res.json({
            message: "Counter updated successfully",
            book: updatedBook,
          });
        })
        .catch((error) => {
          res.status(500).json({ error: "Error saving the updated book" });
        });
    })
    .catch((error) => {
      res.status(500).json({ error: "Error updating the counter" });
    });
});

//search functionality
router.get("/searchbook", requireLogin, (req, res) => {
  const { bookName } = req.query;

  if (!bookName) {
    return res
      .status(400)
      .json({ error: "Please provide a book name to search" });
  }

  const lowercaseBookName = bookName.toLowerCase();

  USER.findById(req.user._id)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const usercollegeName = user.collegeName;

      if (!usercollegeName) {
        return res.status(400).json({ error: "User collegeName not found" });
      }
      POST.find({
        bookName: { $regex: new RegExp(lowercaseBookName, "i") },
      })
        .sort({ _id: -1 })
        .populate("postedBy", "_id name collegeName")
        .then((posts) => {
          const filteredPosts = posts.filter(
            (post) => post.postedBy.collegeName === usercollegeName
          );
          // console.log("FilteredPosts:", filteredPosts)

          res.json(filteredPosts);
        })

        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: "server error" });
        });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    });
});

router.get("/searchuser", requireLogin, (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res
      .status(400)
      .json({ error: "Please provide a user name to search" });
  }
  const lowercasename = name.toLowerCase();

  USER.findById(req.user._id)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const usercollegeName = user.collegeName;

      if (!usercollegeName) {
        return res.status(400).json({ error: "User collegeName not found" });
      }
      USER.find({
        name: { $regex: new RegExp(lowercasename, "i") },
        "collegeName": usercollegeName, // Use "collegeName" instead of "postedBy.collegeName"
      })
        .select("-password")
        .sort({ _id: -1 })
        .then((posts) => {
          const filteredPosts = posts.filter(
            (post) => post.collegeName === usercollegeName
          );

          // console.log("FilteredPosts:", filteredPosts)

          res.json(filteredPosts);
        })

        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: "server error" });
        });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    });
});

module.exports = router;
