require('dotenv').config();
const express = require ('express');
const bodyParser = require ('body-parser');
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require ("passport-local-mongoose")
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook").Strategy;

const app = express();
const PORT = process.env.PORT || 3000
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended : true }));
app.use(express.static("public"));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email : String,
    password : String,
    googleId: String,
    facebookId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {

    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, cb) {

  console.log(profile);

  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

////////////////////request ////////////////////

app.get("/",function (req,res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }
));

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
});

app.get('/auth/facebook',
  passport.authenticate('facebook'));  

app.get('/auth/facebook/secrets',
passport.authenticate('facebook', { failureRedirect: '/login' }),
function(req, res) {
    // Successful authentication, redirect home.
  res.redirect('/secrets');
});

app.get("/login",function (req,res){
    res.render("login");
});

app.get("/register",function (req,res){
    res.render("register");
});

app.get("/secrets", async (req, res) => {
  try {
    const foundUsers = await User.find({ "secret": { $ne: null } });

    if (foundUsers) {
      res.render("secrets", { usersWithSecret: foundUsers });
    }
  } catch (err) {
    console.log(err);
    // Handle the error appropriately (e.g., send an error response)
  }
});


app.get("/logout",function(req,res){
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
})

app.get("/submit",function(req,res){
  if (req.isAuthenticated()){
    res.render("submit");
}else {
    res.redirect("login")
}
})

////////////////////post ////////////////////

app.post("/register",function(req,res){

    User.register({username: req.body.username}, req.body.password)

    .then(() => {
        passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
        })
    })
    .catch(err => {
        console.log(err);
        res.redirect("/register");
    })

  
    
})

app.post("/login",function(req,res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    try{
        req.login(user,(err)=> {
            if(err){
                console.log(err)
            }else {
                passport.authenticate("local")(req,res,function(){
                    res.redirect("/secrets");
                })
            }
        })
    }
    catch(err){
        console.log(err);
    }
})

app.post("/submit",function(req,res){
  const submittedSecret = req.body.secret;

  console.log(req.user.id);

  User.findById(req.user.id)
  .then((foundUser) => {
    if (foundUser){
      foundUser.secret = submittedSecret;
      foundUser.save()
      .then(()=>{
        res.redirect("/secrets");
      })
      .catch(err => {
        console.log(err);
      })
    }
  })
  .catch(err => {
    console.log(err);
  })

})

////////////////////listening////////////////////

app.listen(PORT, () => {
    console.log("listening for requests");
})
