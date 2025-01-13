 const express = require("express"); 

const router = express.Router(); 


const searhCtrl = require("../controllers/Search");

const auth = require("../middleware/auth");

router.get("/getSearch",auth, searhCtrl.getSearch); 