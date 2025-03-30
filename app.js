const express = require("express");
const benchpressjs = require("benchpressjs");

const app = express();

app.engine('jst', benchpressjs.__express);

app.set('view engine', 'jst');
app.set('views', 'dist/templates');


app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get('/benchpress', (req, res) => {
  res.render('testing', {
    name: 'Benchress User',
  });
});

app.get('/nodebb.js', (req, res) => {
  res.sendFile(__dirname + "/nodebb.js");
});

// Serve static files from the "dist" directory
app.use(express.static(__dirname + "/dist"));
app.use('/benchpress.js', express.static(__dirname + '/node_modules/benchpressjs/build/benchpress.js'));


require('./templates').compile();

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

