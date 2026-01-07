const mongoose = require("mongoose"); 

const contactchema = mongoose.Schema({
    
    object: {type: String}, 
    message: {type: String}, 
    userId: {type: String }, 
    date: {type: Date, default: Date.now}
})

module.exports = mongoose.model("Contact", contactchema);