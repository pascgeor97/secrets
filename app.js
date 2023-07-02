require('dotenv').config();
const express = require ('express');
const bodyParser = require ('body-parser');
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption")

const app = express();

const PORT = process.env.PORT || 3000

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended : true }));
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email : String,
    password : String
});


userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

////////////////////request ////////////////////

app.get("/",function (req,res){
    res.render("home");
});

app.get("/login",function (req,res){
    res.render("login");
});

app.get("/register",function (req,res){
    res.render("register");
});

////////////////////post ////////////////////

app.post("/register",function(req,res){
    const newUser = new User({
        email : req.body.username,
        password : req.body.password
    });
    newUser.save()
    .then(()=>{
        res.render("secrets")
    })
    .catch(err => {
        console.log(err);
    }) 
})

app.post("/login",function(req,res){
    const username = req.body.username;
    const password = req.body.password;
    User.findOne({email : username })
    .then(function(foundUser){
        if (foundUser.password === password) {
            res.render("secrets");
        } else {
            res.send("<h1>Wrong Password! 🪂</h1>");
        }})
    .catch(err => {
        console.log(err);
    }) 
})

////////////////////listening////////////////////

app.listen(PORT, () => {
    console.log("listening for requests");
})
