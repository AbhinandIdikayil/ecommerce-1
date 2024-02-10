const fs = require('fs');
const express = require("express");
const session = require("express-session");
const multer = require('multer')
const createError = require('http-errors');
const path = require('path'); 
const morgan = require("morgan");
const connectDB = require('./database/connection')
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');

const cors = require('cors')
require('dotenv').config()

const app = express();  

const userRoute = require('./routes/userRoute');
const adminRoute = require('./routes/adminRoute');
const { Server } = require('http');

app.set('view engine','ejs');

app.use(cors())
app.use(cookieParser())
// app.use(morgan('combined', { stream: accessLogStream }))
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('assets'))

app.use(session({
    secret:process.env.SECRET_KEY,
    resave:false,
    saveUninitialized:true,
}));

app.use(flash())

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use('/',userRoute);
app.use('/admin',adminRoute)

app.use(function(req, res, next) {
    next(createError(404));
});

app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    if (err instanceof multer.MulterError) {
        // Multer error occurred during file upload
        // You can handle this specific error differently
        res.status(400).render('error', { error: '404' });
      } else {
        // For other errors, use the standard error handling
        if(!req.path.includes('/admin')){
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};
            res.status(err.status || 500);
            res.render('error', { error: err });
        }else{
            console.log('in admin')
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};
            res.status(err.status || 500);
            res.render('adminError', { error: err });
        }
      }
});

const PORT = process.env.PORT || 3000
app.listen(PORT,(err) => {
    connectDB();
    console.log(`server is running`)  
})


module.exports = app;