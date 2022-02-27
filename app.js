const express = require('express')
const bodyParser= require('body-parser')
const app = express()
const path = require("path");
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();


MongoClient.connect(process.env.DB_STRING, { useUnifiedTopology: true }, (err, client) => {
  if (err) console.log('error connecting to database');
  console.log('connected to database');

  app.set('view engine', 'ejs');
  app.set("views", path.join(__dirname, "views"));
  app.use(bodyParser.urlencoded({ extended: true }));

  const db = client.db('nudgyt');
  const usersDb = db.collection('users');

  app.get('/', (req, res) => {
    res.render('index');
  });

  app.post('/create', async (req, res) => {
    const email = req.body.email ? req.body.email.toLowerCase() : '';
    const saltRounds = 10;

    const user = await usersDb.findOne({ email });
    if (user) {
      return res.status(400).json({
        message: 'There is already an existing user in the database.'
      });
    }

    const salt = bcrypt.genSaltSync(saltRounds);
    const password = req.body.password ? bcrypt.hashSync(req.body.password, salt) : '';

    const customerDoc = {
      name: req.body.name,
      email,
      password
    };

    try {
      await usersDb.insertOne(customerDoc);
      return res.status(200).json({
        message: `Account successfully created for ${email}.`
      });
    }
    catch (error) {
      return res.status(400).json({
        message: `Sorry, unable to create a new account for email ${email}`
      });
    }
  });

  app.post('/login', async (req, res) => {
    try {
      const customer = await usersDb.findOne({ email: req.body.email });
      if (!customer) {
        return res.status(400).json({ message: `A customer with that email doesn't exist.` });
      }
  
      const result = await bcrypt.compare(req.body.password, customer.password);
      if (!result) {
        return res.status(400).status({ message: 'Access denied. Check password and try again.' });
        
      }
      return res.status(200).json({
        message: 'Successfully logged in.'
      });
    }
    catch (error) {
      return res.status(400).json({ message: 'Access denied. Check password and try again.' });
    }
  });

  app.get('/view-users', async (req, res) => {
    const users = await usersDb.find({}).toArray();
    res.json(users);
  });

  app.listen(8080, (req, res) => {
    console.log('listening on port 8080')
  });
});