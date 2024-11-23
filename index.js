const express = require("express");
const createHttpError = require("http-errors");
const ConnectFlash = require("connect-flash");
//const passport = require("passport");
//const session = require("express-session");
const MongoStore = require("connect-mongo");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");

const app = express();

//dotenv config

require("dotenv").config();

//connect to database.
const dbConnection = require("./config/db");

app.use(express.json()); //1to get data from post
app.use(express.urlencoded({ extended: true })); //2to get data from post

app.use(cors());

const userModel = require("./models/user");

app.use(bodyParser.json());

/*app.use(
  session({
    secret: "your_secret_key", // Secret key to sign the session ID cookie
    resave: false, // Don't save session if it was not modified
    saveUninitialized: false, // Don't create a session until something is stored
    cookie: {
      maxAge: 1000 * 60 * 60, // Session expires after 1 hour (in milliseconds)
      httpOnly: true, // Prevent client-side JavaScript from accessing cookies
      secure: false, // Set to true if using HTTPS
    },
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  })
);
app.use(passport.initialize());
app.use(passport.session());*/
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

const { roles } = require("./utils/constants");


//css and js files for frontend

//app.use("/", require("./routes/index.route"));
/*app.use(
  "/user",
  connectEnsureLogin.ensureLoggedIn({ redirectTo: "/auth/login" }),
  require("./routes/user.route")
);*/

/*app.use("/user", ensurePatient, require("./routes/apply.route")); //apply
app.use(
  "/admin",
  connectEnsureLogin.ensureLoggedIn({ redirectTo: "/auth/login" }),
  ensureAdmin,
  require("./routes/admin.route")
);*/
// Error handling middleware

app.use("/api/auth", require("./routes/auth.route"));
app.use("/api/user", require("./routes/admin.route"));
app.use("/api/user", require("./routes/apply.route"));
app.use("/api/user", require("./routes/notify.route"));
app.use("/api", require("./routes/doctor.route"));
app.use("/api", require("./routes/appointment.route"));
app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(
  5000,
  console.log("server has started at port http://localhost:5000/")
);
