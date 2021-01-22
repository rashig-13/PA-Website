const express = require("express");
const userRouter = express.Router();
const passport = require("passport");
const passportConfig = require("../passport");
const JWT = require("jsonwebtoken");
const crypto = require("crypto");
var bcrypt = require("bcryptjs");
const fetch = require("node-fetch");
//validate
const validateRegisterInput = require("../validation/register_validate");
// import user-defidned modules or Schema
const User = require("../models/User");
const Todo = require("../models/Todo");

// url: `${baseUrl}/api/user/loginfacebook`;

const signToken = (userID) => {
    return JWT.sign(
        {
            iss: "Programmers_Army",
            sub: userID,
        },
        process.env.SECRETORKEY,
        { expiresIn: "1h" }
    );
};

exports.register = async (req, res) => {
    const { email, first_name, last_name, password } = req.body;
    const { errors, isValid } = validateRegisterInput(req.body);
    // Check for validation
    if (!isValid) {
        return res.status(400).json({ error: true, errorBody: errors });
    }
    User.findOne({ email }, (err, user) => {
        if (err) {
            res.status(500).json({
                error: true,
                errorBody: "Error has occured",
            });
        } else if (user)
            res.status(400).json({
                error: true,
                errorBody: "Email is already taken",
            });
        else {
            const newUser = new User({
                email,
                name: first_name + " " + last_name,
                password,
            });
            newUser.save((err) => {
                if (err)
                    res.status(500).json({
                        error: true,
                        errorBody: "Error has occured",
                    });
                else
                    res.status(201).json({
                        message: "Account successfully created",
                        error: false,
                    });
            });
        }
    });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    User.findOne({ email }, (err, user) => {
        // something went wrong with database
        if (err) {
            res.status(500).json({
                error: true,
                errorBody: "Error has occured",
            });
        }
        // if no user exist
        else if (!user) {
            res.status(401).json({
                error: true,
                errorBody: "Email not registered",
            });
        }
        // check if password is correct
        else {
            // user.comparePassword(password, next);
            bcrypt.compare(password, user.password, function (err, match) {
                if (err) {
                    res.status(500).json({
                        error: true,
                        errorBody: "Error has occured",
                    });
                } else if (!match) {
                    res.status(401).json({
                        error: true,
                        errorBody: "Password does not match",
                    });
                } else {
                    const { _id } = user;
                    user.password = undefined;
                    const token = signToken(_id);
                    res.status(200).json({
                        isAuthenticated: true,
                        token: token,
                        user: user,
                        error: false,
                    });
                }
            });
        }
    });
};

exports.isAuthenticated = (req, res) => {
    res.status(200).json({
        isAuthenticated: true,
        error: false,
    });
};

// Facebook
exports.facebooklogin = async (req, res) => {
    const { userID, accessToken } = req.body;
    const urlGraphFacebook = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email,picture&access_token=${accessToken}`;
    fetch(urlGraphFacebook, {
        method: "GET",
    })
        .then((res) => res.json())
        .then((data) => {
            // console.log("From facebook", data);
            const { email, name } = data;
            User.findOne({ email }, { password: 0 }, (err, saveduser) => {
                if (err) {
                    res.status(500).json({
                        message: {
                            msgError: true,
                            msgBody: "Something went wrong!",
                        },
                    });
                } else {
                    if (saveduser) {
                        //user already have an account
                        const token = signToken(saveduser._id);
                        res.status(200).json({
                            token,
                            user: saveduser,
                            isAuthenticated: true,
                            message: {
                                msgError: false,
                                msgBody: "Login Successful",
                            },
                        });
                    } else {
                        //user is not registered
                        let password = email + process.env.Google_Secret;
                        bcrypt.hash(password, 12).then((hashpassword) => {
                            const newUser = new User({
                                email,
                                name,
                                socialID: {
                                    facebookID: data.userID,
                                },
                                active: true,
                                picture: data.picture.data.url,
                                password: hashpassword,
                            });
                            newUser.save((err) => {
                                if (err)
                                    res.status(500).json({
                                        message: {
                                            msgError: true,
                                            msgBody: "Error has occured",
                                        },
                                    });
                                else
                                    res.status(201).json({
                                        message: {
                                            msgError: false,
                                            msgBody:
                                                "Account successfully created",
                                        },
                                    });
                            });
                        });
                    }
                }
            });
        });
};

// Linkedin
exports.linkedinlogin = async (req, res) => {
    const { code } = req.body.data;
    console.log(code);
    res.status(200).json({ error: false });
    // fetch(urlGraphFacebook, {
    //     method: "GET",
    // })
    //     .then((res) => res.json())
    //     .then((data) => {
    //         // console.log("From facebook", data);
    //         const { email, name } = data;
    //         User.findOne({ email }, { password: 0 }, (err, saveduser) => {
    //             if (err) {
    //                 res.status(500).json({
    //                     message: {
    //                         msgError: true,
    //                         msgBody: "Something went wrong!",
    //                     },
    //                 });
    //             } else {
    //                 if (saveduser) {
    //                     //user already have an account
    //                     const token = signToken(saveduser._id);
    //                     res.status(200).json({
    //                         token,
    //                         user: saveduser,
    //                         isAuthenticated: true,
    //                         message: {
    //                             msgError: false,
    //                             msgBody: "Login Successful",
    //                         },
    //                     });
    //                 } else {
    //                     //user is not registered
    //                     let password = email + process.env.Google_Secret;
    //                     bcrypt.hash(password, 12).then((hashpassword) => {
    //                         const newUser = new User({
    //                             email,
    //                             name,
    //                             socialID: {
    //                                 facebookID: data.userID,
    //                             },
    //                             active: true,
    //                             picture: data.picture.data.url,
    //                             password: hashpassword,
    //                         });
    //                         newUser.save((err) => {
    //                             if (err)
    //                                 res.status(500).json({
    //                                     message: {
    //                                         msgError: true,
    //                                         msgBody: "Error has occured",
    //                                     },
    //                                 });
    //                             else
    //                                 res.status(201).json({
    //                                     message: {
    //                                         msgError: false,
    //                                         msgBody:
    //                                             "Account successfully created",
    //                                     },
    //                                 });
    //                         });
    //                     });
    //                 }
    //             }
    //         });
    //     });
};
