const express = require("express");
const app = express();
const connection = require("./connection")
app.use(express.json());
var generator = require('generate-password');
const CryptoJS=require("crypto-js");
const crypto = require('crypto');
const dotenv  = require("dotenv");
dotenv.config()
var jwt = require('jsonwebtoken');
const verifyToken= require('./verifyToken')

function getDateTime(){
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date+' '+time;
    return dateTime;
}

function generateUserID() {
    var min = 100000; // Minimum value (inclusive)
    var max = 999999; // Maximum value (inclusive)
    var userID = Math.floor(Math.random() * (max - min + 1)) + min;
    return userID;
}

function generateBookID() {
    var min = 100000; // Minimum value (inclusive)
    var max = 999999; // Maximum value (inclusive)
    var userID = Math.floor(Math.random() * (max - min + 1)) + min;
    return userID;
}



app.post("/api/signup",(req,res)=>{
     const username = req.body.username;
     const password = req.body.password;
     const email = req.body.email;
     const user_id = generateUserID(email,6);

    var sql = 'INSERT INTO workindia.user VALUES (?,?,?,?,?,CURDATE(),?)';
    connection.query(sql,
        [   
            username,
            password,
            email,
            user_id,
            "NO", 
            "NULL"
        ],
        function (err, result) {
        if (err) throw err;

        res.status(200).json({
            "status": "Account successfully created",
            "status_code": 200,
            "user_id": user_id
        })
        
    });

})

app.post("/api/login",(req,res)=>{
    const username = req.body.username;
    const password = req.body.password;

    var sql = 'SELECT * FROM  workindia.user WHERE username = ? and password = ?';
    connection.query(sql,
        [   
            username,
            password, 
        ],
        function (err, user) {
        if (err) throw err;

        if(user[0].length==0) res.send(401).json({
            "status": "Incorrect username/password provided. Please retry",
            "status_code": 401
        })
       else{

        const token = jwt.sign({username: user[0].username},process.env.JWT_KEY, {
            expiresIn : "100 minutes"
        })

        res.cookie('jwt', token, {
            expires: new Date(Date.now() + 600000),
            httpOnly: true
        })

        res.status(200).json({
            "status": "Login successful",
            "status_code": 200,
            "user_id": user[0].user_id,
            "access_token": token,
        })

       }
        
        
    });


})

app.post("/api/books/create",(req,res)=>{
    const title = req.body.title;
    const author = req.body.author;
    const isbn = req.body.isbn;
    const bookid = generateBookID();
    const issue_date = '2023-01-02T12:00:00Z'

    var sql = 'INSERT INTO workindia.book VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,?)';
    connection.query(sql,
        [   
            title,
            author,
            isbn,
            bookid,
            issue_date, 
            "NULL"
        ],
        function (err, result) {
        if (err) throw err;

        res.status(200).json({
            "message": "Book added successfully",
            "book_id": bookid,
        })
        
    });


})

app.post("/api/books/delete",(req,res)=>{
    const bookid = req.body.bookid;

    var sql = `DELETE FROM workindia.book
    WHERE book_id = ?`;
    connection.query(sql,
        [   
            bookid
        ],
        function (err, result) {
        if (err) throw err;

        res.status(200).json({
            "message": "Book Deleted successfully",
            "book_id": bookid,
        })
        
    });
})


app.get("/api/books",(req,res)=>{
    const title = req.query.title;

    var sql = `select * from workindia.book where title like '%${title}%' or title like '${title}%'`;
    connection.query(sql,
        function (err, result) {
        if (err) throw err;

        res.status(200).json({
            result
        })
        
    });

})

app.get("/api/books/:bookid/availability",(req,res)=>{
    const bookid = req.params.bookid;

    var sql = 'SELECT * FROM  workindia.book WHERE bookid=?';
    connection.query(sql,
        [   
            bookid,
        ],
        function (err, book) {
        if (err) throw err;

        if(book[0].length==0) res.send(401).json({
            "status": "Incorrect ID provided. Please retry",
            "status_code": 401
        })
       else{

        const currentTime = new Date();
        const bookDateTime = new Date(book[0].returntime);

        if (currentTime > bookDateTime) {
            res.status(201).json({
                "book_id": book[0].book_id,
                "title": book[0].title,
                "author": book[0].author,
                "available": true
            })
        } else {
            const next_available_at = new Date(bookDateTime);
            next_available_at.setDate(bookDateTime.getDate() + 1);

            res.status(201).json({
                "book_id": book[0].book_id,
                "title": book[0].title,
                "author": book[0].author,
                "available": false,
                "next_available_at": next_available_at,
            })
        }

       }
        
        
    });

})

app.get("/api/books/borrow",verifyToken,(req,res)=>{

    const book_id = req.body.book_id;
    const user_id = req.body.user_id;
    const issue_time = req.body.issue_time;
    const return_time = req.body.return_time;

    var sql = 'SELECT * FROM  workindia.book WHERE bookid=?';
    connection.query(sql,
        [ 
            book_id,
        ],
        function (err, book) {
        if (err) throw err;

        if(book[0].length==0) res.send(401).json({
            "status": "Incorrect ID provided. Please retry",
            "status_code": 401
        })
       else{

        const currentTime = new Date();
        const bookDateTime = new Date(book[0].returntime);
        const booking_id=generateBookID();

        if (currentTime > bookDateTime) {
            

            //update user
            var sql =`UPDATE workindia.user SET bookingid =? WHERE user_id=?`
            connection.query(sql,
            [   
                booking_id,
                user_id
            ],
            function (err, result) {
            if (err) throw err;
            });


            //update book
            var sql =`UPDATE workindia.book
            SET bookingid = ?,issuetime=?,returntime=?
            WHERE bookid=?;`
            connection.query(sql,
            [   
                booking_id,
                issue_time,
                return_time,
                book_id,
            ],
            function (err, result) {
            if (err) throw err;
            });

            res.status(200).json({
                "status": "Book booked successfully",
                "status_code": 200,
                "booking_id": booking_id,
            })


        } else {
           
            res.status(400).json({
                "status": "Book is not available at this moment",
                "status_code": 400
            })
        }

       }
        
        
    });

    




})


app.listen(3000,()=>{
    console.log("Backend server is running!!")
})
