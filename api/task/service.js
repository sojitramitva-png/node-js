const { ObjectId } = require('mongodb');
// const taskModal = require("../../collection/taskModel");

module.exports = {
    getTaskList: async (req) => {
        try {
            const { role } = req.decoded;
            let userId = "";
            if (role === 'admin') {
                userId = req.query.userId // Get userId from query parameters for admin
            } else {
                userId = req.decoded.userId; // Use decoded userId for non-admin users
            }
            let lstTask = await taskModal.find({ $and: [{ userId: new ObjectId(userId) }, { isdelete: { $ne: true } }] }).sort({ cdt: -1 });
            return ({ status: 200, data: { status: "success", data: lstTask } });
        } catch (error) {
            return ({ status: 400, data: "Get task list faild !" });
        }
    },
    addTask: async (req) => {
        try {
            if (!req.body._id) {
                let userId = req.decoded.userId;
                let objTask = new taskModal(req.body);
                objTask._id = new ObjectId();
                objTask.userId = req.body.userId || userId; // Use provided userId or fallback to decoded userId
                objTask.cdy = userId; // Created by user id
                await objTask.save();

                // Emit to task owner and creator (if different)
                io.to(`user_${objTask.userId}`).emit('taskCreated', objTask);
                if (objTask.userId !== objTask.cdy) {
                    io.to(`user_${objTask.cdy}`).emit('taskCreated', objTask);
                }

                return ({ status: 200, data: { status: "success", data: objTask } });
            }
        } catch (error) {
            console.log(error, "errorerrorerrorerror");

            return ({ status: 400, data: "add task faild !" });
        }
    },
    deleteTask: async (req) => {
        try {
            const { userId, role } = req.decoded;
            let taskId = req.body._id;

            let deleteQuery = {};

            // Admin can delete any task, so only check _id
            if (role === 'admin') {
                deleteQuery = { _id: taskId };
            } else { // Non-admin users can only delete tasks they created
                deleteQuery = { $and: [{ cdy: userId }, { _id: taskId }] };
            }

            // Get task details before deletion to know who to notify
            const taskToDelete = await taskModal.findOne(deleteQuery);

            if (taskToDelete) {
                await taskModal.findOneAndUpdate(deleteQuery, { isdelete: true });

                // Emit to task owner and creator (if different)
                io.to(`user_${taskToDelete.userId}`).emit('taskDeleted', { taskId });
                if (taskToDelete.userId.toString() !== taskToDelete.cdy.toString()) {
                    io.to(`user_${taskToDelete.cdy}`).emit('taskDeleted', { taskId });
                }
            }
            return ({ status: 200, data: { status: "success", data: null } });
        } catch (error) {
            return ({ status: 400, data: "delete task faild !" });
        }
    },

    updateTask: async (req) => {
        try {
            const { userId, role } = req.decoded;
            let updateObj = {};
            if (req.body.title) updateObj.title = req.body.title;
            if (req.body.desc) updateObj.desc = req.body.desc;
            if (req.body.priority) updateObj.priority = req.body.priority;
            if (req.body.status) updateObj.status = req.body.status;
            if (req.body.comments) updateObj.comments = req.body.comments;

            // Build dynamic query based on user role
            let updateQuery = {};

            // Admin can update any task
            if (role === 'admin' || req.body.comments || req.body.status) {
                updateQuery = { _id: req.body._id };
            } else {
                updateQuery = { $and: [{ cdy: userId }, { _id: req.body._id }] };
            }
            let objTask = await taskModal.findOneAndUpdate(updateQuery, { $set: updateObj }, { new: true });
            if (objTask) {

                // Emit to task owner and creator (if different)
                io.to(`user_${objTask.userId}`).emit('taskUpdated', objTask);
                if (objTask.userId.toString() !== objTask.cdy.toString()) {
                    io.to(`user_${objTask.cdy}`).emit('taskUpdated', objTask);
                }
            }

            return ({ status: 200, data: { status: "success", data: objTask } });
        } catch (error) {
            return ({ status: 400, data: "update task faild !" });
        }
    }
}