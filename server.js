const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose')
//mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

console.clear();

mongoose.connect(process.env.MONGOLAB_URI, {useNewUrlParser: true, useUnifiedTopology: true});
console.log("DB state: " + mongoose.connection.readyState);

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true
  }
});

let User = mongoose.model("User", userSchema);

const exerciseSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  description:{ type: String },
  duration:{ type: Number },
  date:{ type: Date }
});

let Exercise = mongoose.model("Exercise", exerciseSchema);


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// developer
app.get("/developer", function (req, res) {
  res.json({
    "developer":"Leo Vargas",
    "company":"Magno Technologies"
  });
});

app.post("/api/exercise/new-user", function (req, res){
  let userName = req.body.username;

  User.findOne({username: userName}, function(err, userFound){
    if (err) {
      console.error(err);
      return false;
    }
    if (userFound) {
      // retrieves stored username
      res.json({
        "_id":userFound._id,
        "username":userFound.username
      });
    } else {
      // saves new user to database
      let user = new User({
        username:userName
      });

      user.save(function(err, userSaved){
        if (err) return console.error(err);
        //console.log(userSaved);
        res.json({
          "_id":userSaved._id,
          "username":userSaved.username
        });
      });
    }// user found in db
  });
});

// Add exercise
app.post("/api/exercise/add", function(req, res){
  let userId = req.body.userId;
  let userName = "";
  let description = req.body.description;
  let duration = Number(req.body.duration);
  let date = req.body.date;

  // Validate date input format yyyy-mm-dd
  if (/\d{4}-\d{1,2}-\d{1,2}/.test(date)){
    // Convert date input to date and validate if it is a valid date
    date = new Date(date);
    if (date != "Invalid Date"){
        // Validate duration input
      if (isNaN(duration)){
        res.json({
          "error":"duration should be expressed in numbers, input: " + req.body.duration
        });
      } else {
        User.findById(userId, function(err, userFound){
          if (err) {
            console.error(err);
            return false;
          }
          if (userFound) {
            // retrieves stored username
            userName = userFound.username;
            // search for existing exercise
            Exercise.findOne({description: description}, function(err, exerciseFound){
              if (err){
                console.error(err);
                return false;
              }
              if (exerciseFound){
                res.json({
                  "id":exerciseFound._id,
                  "user": userName,
                  "description":exerciseFound.description,
                  "duration": exerciseFound.duration,
                  "date": exerciseFound.date,
                  "found":"true"
                });
              } else {
                // saves new user to database
                let exercise = new Exercise({
                  userId:userId,
                  description:description,
                  duration:duration,
                  date:date
                });

                exercise.save(function(err, data){
                  if (err) return console.error(err);
                  console.log(data);
                  res.json({
                    "username":userName,
                    "description":data.description,
                    "duration":data.duration,
                    "_id":userId,
                    "date":data.date.toDateString()
                  });
                });
              } // exercise found in db
            });
          } else {
            res.json({
              "username":userName,
              "found":"false",
              "error":"User not found, create an user first."
            });
          }// user found in db
        });
      }// duration validation
    } else {
      res.json({
        "error":"date should be a valid date yyyy-mm-dd, input: " + req.body.date
      });      
    } // date validation
  } else {
    res.json({
      "error":"date should be expressed in yyyy-mm-dd format, input: " + req.body.date
    });
  } // date format validation
});

// delete user
app.get("/api/exercise/delete-user/:username", function (req, res){
  let userName = req.params.username;
  User.deleteOne({username:userName}, function(err){
    if (err){
      console.error(err);
      res.json({
        "error":"username not found, username: " + userName
      });
    } else {
      res.json({
        "successful":"username deleted from db, username: " + userName
      });
    }
  });  
});

// GET /api/exercise/delete-exercise/:exercise
app.get("/api/exercise/delete-exercise/:exercise", function (req, res){
  let description = req.params.exercise;
  Exercise.deleteOne({description:description}, function(err){
    if (err){
      console.error(err);
      res.json({
        "error":"exercise not found, description: " + description
      });
    } else {
      res.json({
        "successful":"exercise deleted from db, description: " + description
      });
    }
  });  
});

// GET api/exercise/users
app.get("/api/exercise/users", function(req, res){
  User.find({}, function(err, users){
    if (err){
      console.error(err);
    }
    if (users){
      console.log(users);
      res.json({users});
    }
  })
  .select('-__v');
});

// GET /api/exercise/log?{userId}[&from][&to][&limit]
app.get("/api/exercise/log", function(req, res){
  let userId = req.query.userId;
  let userName = "";
  let from = req.query.from;
  let to = req.query.to;
  let limit = Number(req.query.limit) || 10;
  let today = new Date();

  // get data from last week if from is not defined
  if (from == undefined){
    let lastWeek = today.getDate() - 7;
    from = new Date(lastWeek);
  }
  // get data up today if to is not defined
  if (to == undefined){
    to = new Date(today);
  }
  
  User.findById(userId, function(err, userFound){
    if (err) {
      console.error(err);
      return false;
    }
    if (userFound){
      userName = userFound.username;

      // get exercise data
      Exercise.find({
            userId:userId,
            date: {"$gte": new Date(from), "$lt": new Date(to)},
          }, function(err, exercisesFound){
            if (err){
              console.error(err);
              return false;
            }
            console.log(exercisesFound);
            if (exercisesFound){
              res.json({
                "_id":userFound._id,
                "username":userFound.username,
                "count":exercisesFound.length,
                "log":exercisesFound
              });
            }
          })
          .sort({date:'desc', description:'asc'})
          .limit(limit)
          .select('-_id -__v');
    } else {      
      res.json({
        "error":"userId not found in db, userId: " + userId
      });
    }
  })
  .select('-__v');// User find
});
  
  
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
