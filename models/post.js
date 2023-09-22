const mongoose = require("mongoose")
const { ObjectId } = mongoose.Schema.Types

const postSchema = new mongoose.Schema({
    bookName:{
        type: String,
        required: true
    },
    authorName:{
        type: String,
        required: true
    },
    bookCover:{
        type: String,
        required: true
    },
    bookCondition:{
        type: String,
        required: true
    },
    bookCoverColor:{
        type: String,
        required: true
    },
    availability:{
        type:String,
        default: "Available"
    },
    availabledate:{
        type: Date,
        default: Date.now
    },
    postedBy:{
        type: ObjectId,
        ref: "USER"
    }
})

mongoose.model("POST", postSchema)