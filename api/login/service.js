const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
//const userModal = require("../../collection/userModel");
const passwordService = require('../../passwordService');


module.exports = {
    auth: async (req) => {
        try {
            //check user exists or not 
            // let ExistingUser = await userModal.findOne({ email: req.body.email });
            let ExistingUser = await db.collection("users").where("email", "==", req.body.email).limit(1).get();

            if (ExistingUser) {
                return ({ status: 200, data: { status: 'duplicate', message: "User Already exists !", data: null } });
            } else {
                let userData = new userModal(req.body);
                if (req.body.email === 'admin@gmail.com') {
                    userData.role = 'admin';
                } else {
                    userData.role = 'user';
                }
                userData._id = new ObjectId();
                userData.password = await passwordService.createHashPwd(req.body.password);
                await userData.save();
                const token = jwt.sign({ userId: userData._id, role: userData.role }, 'as#ndjadsa#@dsad$##k%*#MK!@', {
                    expiresIn: '1h',
                });
                let resData = {
                    userId: userData._id,
                    name: userData.name,
                    email: userData.email,
                    authToken: token,
                    role: userData.role
                }
                return ({ status: 200, data: { status: 'success', message: "User Register Successfully", data: resData } });
            }
        } catch (error) {
            return ({ status: 400, data: "Login failed" });
        }
    },

    login: async (req) => {
        try {
            let userData = await userModal.findOne({ email: req.body.email });
            if (userData) {
                const comparePwd = await passwordService.comparePwd(req.body.password, userData.password);
                if (comparePwd) {
                    const token = jwt.sign({ userId: userData._id, role: userData.role }, 'as#ndjadsa#@dsad$##k%*#MK!@', {
                        expiresIn: '1h',
                    });

                    let resData = {
                        userId: userData._id,
                        name: userData.name,
                        email: userData.email,
                        profile: userData.profile,
                        authToken: token,
                        role: userData.role
                    }
                    return ({ status: 200, data: { status: 'success', message: "User Login Successfully", data: resData } });
                } else {
                    return ({ status: 401, data: { status: 'unauthorized', message: 'Invalid email address or password' } });
                }
            } else {
                return ({ status: 200, data: { status: 'not_found', message: 'User not found' } });
            }
        } catch (error) {
            console.log(error, "error in login service");
            return ({ status: 400, data: "Login failed" });
        }
    },

    getUserList: async (req) => {
        try {
            const { role } = req.decoded;
            if (role !== 'admin') {
                return ({ status: 403, data: { status: 'not_found', message: "Forbidden: You do not have permission to access this resource." } });
            }
            let userList = await userModal.find({ role: 'user' }, { password: 0, __v: 0 });
            return ({ status: 200, data: { status: "success", data: userList } });
        } catch (error) {
            console.log(error, "error in getUserList service");

            return ({ status: 400, data: "Get user list failed !" });
        }
    }
}