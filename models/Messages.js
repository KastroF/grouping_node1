const mongoose = require('mongoose'); 

const messageSchema = mongoose.Schema({
    text: { type: String }, 
    date: { type: Date }, 
    user1Id: { type: String }, 
    user2Id: { type: String }, 
    id_annonce: { type: String },  // champ facultatif ajouté
    read: {type: Boolean, default: false}
})

module.exports = mongoose.model("Message", messageSchema);
