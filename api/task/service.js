const { db, admin } = require("../../firebase");

module.exports = {

  // ================= GET TASK LIST =================
  getTaskList: async (req) => {
    try {
      const { role, userId: decodedUserId } = req.decoded;
      let userId = role === "admin" ? req.query.userId : decodedUserId;

      console.log("calll====>>>>1");

      const snapshot = await db.collection("tasks")
        .where("userId", "==", userId)
        .where("isdelete", "==", false)
        .orderBy("cdt", "desc")
        .get();

      console.log("calll====>>>>222");
      const lstTask = snapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data()
      }));

      return {
        status: 200,
        data: { status: "success", data: lstTask }
      };

    } catch (error) {
      console.log(error);
      return { status: 400, data: "Get task list failed !" };
    }
  },


  // ================= ADD TASK =================
  addTask: async (req) => {
    try {

      const decodedUserId = req.decoded.userId;
      const docRef = db.collection("tasks").doc();

      const newTask = {
        title: req.body.title,
        desc: req.body.desc,
        priority: req.body.priority,
        status: req.body.status || "pending",
        comments: req.body.comments || "",
        userId: req.body.userId || decodedUserId,
        cdy: decodedUserId,
        isdelete: false,
        cdt: admin.firestore.FieldValue.serverTimestamp()
      };

      await docRef.set(newTask);

      const responseTask = {
        _id: docRef.id,
        ...newTask
      };

      // Socket Emit
      io.to(`user_${newTask.userId}`).emit("taskCreated", responseTask);

      if (newTask.userId !== newTask.cdy) {
        io.to(`user_${newTask.cdy}`).emit("taskCreated", responseTask);
      }

      return {
        status: 200,
        data: { status: "success", data: responseTask }
      };

    } catch (error) {
      console.log(error);
      return { status: 400, data: "Add task failed !" };
    }
  },


  // ================= DELETE TASK (Soft Delete) =================
  deleteTask: async (req) => {
    try {

      const { userId, role } = req.decoded;
      const taskId = req.body._id;

      const docRef = db.collection("tasks").doc(taskId);
      const taskDoc = await docRef.get();

      if (!taskDoc.exists) {
        return { status: 404, data: "Task not found" };
      }

      const taskData = taskDoc.data();

      // Permission Check
      if (role !== "admin" && taskData.cdy !== userId) {
        return { status: 403, data: "Permission denied" };
      }

      await docRef.update({ isdelete: true });

      // Socket Emit
      io.to(`user_${taskData.userId}`).emit("taskDeleted", { taskId });

      if (taskData.userId !== taskData.cdy) {
        io.to(`user_${taskData.cdy}`).emit("taskDeleted", { taskId });
      }

      return {
        status: 200,
        data: { status: "success", data: null }
      };

    } catch (error) {
      console.log(error);
      return { status: 400, data: "Delete task failed !" };
    }
  },


  // ================= UPDATE TASK =================
  updateTask: async (req) => {
    try {

      const { userId, role } = req.decoded;
      const taskId = req.body._id;

      let updateObj = {};

      if (req.body.title) updateObj.title = req.body.title;
      if (req.body.desc) updateObj.desc = req.body.desc;
      if (req.body.priority) updateObj.priority = req.body.priority;
      if (req.body.status) updateObj.status = req.body.status;
      if (req.body.comments) updateObj.comments = req.body.comments;

      const docRef = db.collection("tasks").doc(taskId);
      const taskDoc = await docRef.get();

      if (!taskDoc.exists) {
        return { status: 404, data: "Task not found" };
      }

      const taskData = taskDoc.data();

      // Permission Logic
      if (
        role !== "admin" &&
        taskData.cdy !== userId &&
        !req.body.comments &&
        !req.body.status
      ) {
        return { status: 403, data: "Permission denied" };
      }

      await docRef.update(updateObj);

      const updatedTask = {
        _id: taskId,
        ...taskData,
        ...updateObj
      };

      // Socket Emit
      io.to(`user_${taskData.userId}`).emit("taskUpdated", updatedTask);

      if (taskData.userId !== taskData.cdy) {
        io.to(`user_${taskData.cdy}`).emit("taskUpdated", updatedTask);
      }

      return {
        status: 200,
        data: { status: "success", data: updatedTask }
      };

    } catch (error) {
      console.log(error);
      return { status: 400, data: "Update task failed !" };
    }
  }

};