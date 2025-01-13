const express = require("express"); 
const mongoose = require("mongoose");

const fs = require("fs");
const cors = require('cors');
const path = require("path");

const app = express();
app.use(cors());

app.use(express.json({limit: "50mb"})); 
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

    next();
});

mongoose.connect("mongodb+srv://fideleNdzime:K5kTxlDbjQl8k7yt@cluster0.rb7vp80.mongodb.net/grouping?retryWrites=true&w=majority",

  { useNewUrlParser: true,
    useUnifiedTopology: true, autoIndex: true })
  .then(() => console.log('Connexion à MongoDB réussie !'))
  .catch((err) => console.log('Connexion à MongoDB échouée !', err));


const cityRouter = require("./routes/City");
const userRouter = require("./routes/User");
const countryRouter = require("./routes/Country"); 
const announcementRouter = require("./routes/Announcement"); 
const messageRouter = require("./routes/Message");
const notificationRouter = require("./routes/Notification");
//const searchRouter = require("./routes/Search");


app.use("/api/country", countryRouter)
app.use("/api/city", cityRouter); 
app.use("/api/user", userRouter);
app.use('/pdf_documents', express.static(path.join(__dirname, 'pdf_documents')));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/api/annonce", announcementRouter);
app.use("/api/message", messageRouter); 
app.use("/api/notification", notificationRouter);
//app.use("/api/search", searchRouter);

module.exports = app;