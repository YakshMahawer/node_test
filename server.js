//To use Express Framework
const express = require("express");
//TO change the incoming requests to JSON format
const bodyParser = require('body-parser');
//For session Storage
const session = require('express-session');
//To connect mongoDB and nodejs in a easy way
const mongoose = require('mongoose');
//Creating an object of express
const app = express();
//For tokenization
const jwt = require('jsonwebtoken');
//For encryption
const bcrypt = require('bcrypt');

const JWT_SECRET = 'SunRisesFromTheEast';
//Middleware to create a session whenever req.session is called
app.use(session({
    secret: 'yaksh1234',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      }
  }));

//Middleware to parse incoming data
app.use(bodyParser.urlencoded({ extended: true }));
//Both line to setup EJS template engine
//views is default folder name, you can change but need to write extra code for that
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Connect to MongoDB
//This URL available from MongoDB Atlas CLoud 
mongoose.connect('mongodb+srv://yakshmahawer:npGscv4UMcZTx1LG@nodetest.uyfhmiu.mongodb.net/?retryWrites=true&w=majority&appName=nodetest', {
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

//Creating a Schema for our user data
//Not compulsory to make schema in mongodb but can be used to set a template of our data
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

//Function to generate the token 
function generateToken(user) {
    return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
}

//Function to verify is the token saved in session valid or not
function verifyToken(req, res, next) {
    const token = req.session.token;
    if (!token) return res.status(403).json({ error: 'Token is required' });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

//tells what to do when url is /login
app.get('/login', (req, res) => {
    //Open Page named login, as we have set the template engine it will find ejs from views/ folder
    res.render('login');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.get('/home', verifyToken, async (req, res) => {
    try {
        // Fetch user data from database based on decoded JWT token
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        //Opening home page but also sending some data with it
        res.render('home', { user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/home/update', verifyToken, async (req, res) => {
    const newName = req.body.name;
    console.log(newName);
    try {
        // Find user by ID and update name
        const updatedUser = await User.findByIdAndUpdate(req.user.id, { name: newName }, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        console.log("Changes Updated");
        res.redirect('../home');
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.post('/home/delete', verifyToken, async (req, res) => {
    try {
        // Find user by ID and delete account
        console.log(req.user.id);
        const deletedUser = await User.findByIdAndDelete(req.user.id);
        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.redirect('../login');
    } catch (error) {
        console.error('Error deleting user account:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            res.render('login', {err: "No User Found. Create Account.."});
        }
        else{
            //Comparing password from database and given password
            bcrypt.compare(password, user.password, (err, result) => {
                if (err) {
                  // Handle error
                  console.error('Error comparing passwords:', err);
                } else {
                  if (result) {
                    //If true creating a token and a session
                    const token = generateToken(user);
                    req.session.token = token;
                    res.redirect('/home');
                  } else {
                    res.render('login', {err: "Wrong Password.."});
                  }
                }
              });
        }
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



app.post('/signup', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.render('signup', {error: "User Already Exist. Choose anothe email"});
        }
        else{
            bcrypt.hash(password, 10, // Rounds of hashing - 10
            async (err, hashedPassword) => {
            if (err) {
              // Handle error
              console.error('Error hashing password:', err);
            } else {
                // Create a new user
                //Saving new user data
                const newUser = new User({ email: email, password: hashedPassword, name: name });
                await newUser.save();
                console.log("User Created Succesfully");
                //Generating token and session
                const token = generateToken(newUser);
                req.session.token = token;
                res.redirect('/home');
            }
        });
        }
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//Start server and listen to given port
app.listen(8000, (err) => {
    if(err){
        console.log(err);
    }
    else{
        console.log("Listening to Server")
    }
});