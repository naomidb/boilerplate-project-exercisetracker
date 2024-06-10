const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// DB setup
mongoose.connect(process.env.MONGO_URI,
  { useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  });

const Schema = mongoose.Schema;

const exerciseSchema = new Schema({
  description: String,
  duration: Number,
  date: Date
});

const userSchema = new Schema({
  username: { type: String, required: true },
  log: [ { type: exerciseSchema }]
});

let User;
let Exercise;

User = mongoose.model("User", userSchema);
Exercise = mongoose.model("Exercise", exerciseSchema);

// Basic configuration
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Post endpoint for adding new users
app.post('/api/users', function(req, res) {
  var newUser = new User({ "username": req.body.username });

  newUser.save(function(err, data) {
    if (err) return console.log(err);
    res.json({ "username": newUser.username, "_id": newUser.id })
  });
});

// Get endpoint for getting list of users
app.get('/api/users', function(req, res) {
  var response = []
  User.find({}, function(err, users) {
    if (err) return console.log(err);
    users.map(user => {
      response.push({ "username": user.username, "_id": user.id });
    });
    res.json(response)
  });
});

// Post endpoint for adding new exercises
app.post('/api/users/:_id/exercises', function(req, res) {
  // checkDate function from : https://forum.freecodecamp.org/t/back-end-development-and-apis-projects-exercise-tracker/674927/3
  // Possibly the timezone situation should be in some way addressed in project specs
  const checkDate = (date) => {
    if (!date) {
      return (new Date(Date.now())).toDateString();
    } else {
      const parts = String(date).split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);

      const utcDate = new Date(Date.UTC(year, month, day));
      return new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000).toDateString();
    }
  }
  
  var newExercise = new Exercise({"description": String(req.body.description),
                               "duration": Number(req.body.duration),
                               "date": checkDate(req.body.date)
  });

  User.findById(req.params._id, function(err, user){
    if (err) return console.log(err);
    user.log.push(newExercise);

    user.save((error, updatedUser) => {
      if (error) return console.log(error);
      var response = {"username": updatedUser.username,
                      "description": String(newExercise.description),
                      "duration": Number(newExercise.duration),
                      // "date": checkDate(newExercise.date), 
                      "date": new Date(newExercise.date).toDateString(),
                      "_id": updatedUser.id
      }
      res.json(response);
    })
  });
});

// Get endpoint for listing exercises for user
app.get('/api/users/:_id/logs', function(req, res) {
  User.findById(req.params._id, function(err, user){
    if (err) return console.log(err);

    var exercise_log = [];
    var log_count = 1;

    for (var exercise of user.log){
      if (req.query.limit && log_count > req.query.limit) {
        break;
      }
      if (req.query.from && exercise.date < req.query.from){
        continue;
      }
      if (req.query.to && exercise.date > req.query.to){
        continue;
      }
      exercise_log.push({"description": exercise.description,
                         "duration": exercise.duration,
                         "date": exercise.date.toDateString()
        });
      log_count++;
    }

    var response = {"username": user.username,
                "count": user.log.length,
                "_id": user.id,
                "log": exercise_log};

    res.json(response);
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
