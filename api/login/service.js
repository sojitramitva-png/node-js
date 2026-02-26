const jwt = require("jsonwebtoken");
const { db, admin } = require("../../firebase");
const passwordService = require("../../passwordService");

module.exports = {

  // ================= REGISTER =================
  auth: async (req) => {
    try {

      // Check if user already exists
      const snapshot = await db.collection("users")
        .where("email", "==", req.body.email)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return {
          status: 200,
          data: {
            status: "duplicate",
            message: "User Already exists !",
            data: null
          }
        };
      }

      // Create new user document
      const docRef = db.collection("users").doc();

      const hashedPassword = await passwordService.createHashPwd(req.body.password);

      let userData = {
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
        role: req.body.email === "admin@gmail.com" ? "admin" : "user",
        profile: req.body.profile || "",
        cdt: admin.firestore.FieldValue.serverTimestamp()
      };

      await docRef.set(userData);

      const token = jwt.sign(
        { userId: docRef.id, role: userData.role },
        "as#ndjadsa#@dsad$##k%*#MK!@",
        { expiresIn: "1h" }
      );

      let resData = {
        userId: docRef.id,
        name: userData.name,
        email: userData.email,
        authToken: token,
        role: userData.role
      };

      return {
        status: 200,
        data: {
          status: "success",
          message: "User Register Successfully",
          data: resData
        }
      };

    } catch (error) {
      console.log(error);
      return { status: 400, data: "Register failed" };
    }
  },


  // ================= LOGIN =================
  login: async (req) => {
    try {

      const snapshot = await db.collection("users")
        .where("email", "==", req.body.email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return {
          status: 200,
          data: { status: "not_found", message: "User not found" }
        };
      }

      const doc = snapshot.docs[0];
      const userData = doc.data();

      const comparePwd = await passwordService.comparePwd(
        req.body.password,
        userData.password
      );

      if (!comparePwd) {
        return {
          status: 401,
          data: {
            status: "unauthorized",
            message: "Invalid email address or password"
          }
        };
      }

      const token = jwt.sign(
        { userId: doc.id, role: userData.role },
        "as#ndjadsa#@dsad$##k%*#MK!@",
        { expiresIn: "1h" }
      );

      let resData = {
        userId: doc.id,
        name: userData.name,
        email: userData.email,
        profile: userData.profile || "",
        authToken: token,
        role: userData.role
      };

      return {
        status: 200,
        data: {
          status: "success",
          message: "User Login Successfully",
          data: resData
        }
      };

    } catch (error) {
      console.log(error, "error in login service");
      return { status: 400, data: "Login failed" };
    }
  },


  // ================= GET USER LIST (Admin Only) =================
  getUserList: async (req) => {
    try {

      const { role } = req.decoded;

      if (role !== "admin") {
        return {
          status: 403,
          data: {
            status: "forbidden",
            message: "Forbidden: You do not have permission."
          }
        };
      }

      const snapshot = await db.collection("users")
        .where("role", "==", "user")
        .get();

      let userList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: doc.id,
          name: data.name,
          email: data.email,
          profile: data.profile || "",
          role: data.role
        };
      });

      return {
        status: 200,
        data: {
          status: "success",
          data: userList
        }
      };

    } catch (error) {
      console.log(error, "error in getUserList service");
      return { status: 400, data: "Get user list failed !" };
    }
  }

};