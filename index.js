require('dotenv').config({
  path: 'sample.env'
});
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const dns = require('dns');
const mongoose = require('mongoose');

// Mongo setup
mongoose.connect(process.env.MONGO_URI);
const urlSchema = new mongoose.Schema({
  url: String,
  id: String
});
var urlModel = new mongoose.model('URL', urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// GET mongoose status
app.get('/api/mongoose-ok', (req, res) => {
  if (mongoose) {
    res.json({ isMongooseOk: !!mongoose.connection.readyState });
  } else {
    res.json({ isMongooseOk: false });
  }
});

// POST a new shorturl
app.post('/api/shorturl', async (req, res) => {
  // Parse domain from url
  const url = req.body.url;
  const regex = new RegExp('^(?:https?://)?(?:[^@/\n]+@)?(?:www\.)?([^:/\n]+)', 'igm');
  var match = regex.exec(url);
  var domain = match ? match[1] : null; // match[1] will contain the domain name

  // Check if domain is valid
  var bad = false;
  await dns.promises.lookup(domain).then(
    result => { // if all is well
      result.address == undefined ? bad = true : bad = false
    },
    () => { // if promise is rejected
      bad = true;
    }
  );

  // If domain is invalid
  if (bad) {
    res.json({
      'error': 'Input is invalid.'
    })
    return;
  }

  // Else if all is ok
  const id = Math.round((Date.now() + Math.random())).toString(32);
  var shortenedUrl = new urlModel({
    url: url,
    id: id
  });
  shortenedUrl.save().then(() => console.log('URL (' + url + ') has been uploaded to MongoDB'));
  res.json({
    'url': url,
    'id': id
  });
});

// GET all stored URLs
app.get('/api/url_list', (req, res) => {
  urlModel.find().then(data => {
    res.send(data);
  })
})

// GET shortened url
app.get('/api/shorturl/:id', async (req, res) => {
  const id = req.params.id;
  var redirectTo;
  await urlModel.findOne({id: id})
  .then(data => {
    if(!data) res.status(404).send('URL not found');
    else {
      res.redirect(data.url);
    }
  })
  .catch(err => {
    console.log(err);
    res.status(500).send('Server error');
  });
  
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
