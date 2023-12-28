const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

//Setting up database connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
if (connection) console.log(`MySQL Database connected with host: ${process.env.DB_HOST}`);

//API endpoint for creating a task
exports.CreateTask = async (req, res) => {
  const { username, password, Task_name, Task_app_Acronym } = req.body;
  let { Task_description } = req.body;
  //console.log(username, password, Task_name, Task_app_Acronym, Task_description)
  /*
   * We are checking if the mandatory fields (username, password, Task_name, Task_app_Acronym) are present in the request parameters
   * These fields are mandatory as they are all required for the process of creating a task
   * If they are not present, we will send an error response
   * The error code PS001 is for missing parameters
   */
  if (username === undefined || password === undefined || Task_name === undefined || Task_app_Acronym === undefined) {
    return res.json({
      code: "PS001",
    });
  }
  /*
   * We are checking if they are valid data types
   * If they are not valid, we will send an error response
   * The error code PS002 is for invalid field data types
   */
  if (typeof username !== "string" || typeof password !== "string" || typeof Task_name !== "string" || typeof Task_app_Acronym !== "string") {
    return res.json({
      code: "PS002",
    });
  }
  /*
   * We are checking if the username and password are correct
   * If they are not correct, we will send an error response
   * The error code IM001 is for incorrect username or password
   */
  const user = await validateUser(username, password, connection);
  if (!user) {
    return res.json({
      code: "IM001",
    });
  }
  /*
   * We are checking if the user account is active
   * If it is not active, we will send an error response
   * The error code IM002 is for inactive user account
   */
  if (user.is_disabled === 1) {
    return res.json({
      code: "IM002",
    });
  }
  /*
   * We are checking if the application exists
   * If it does not exist, we will send an error response
   * The error code AM001 is for application does not exist
   */
  const [row1, fields1] = await connection.promise().query("SELECT * FROM application WHERE app_acronym = ?", [Task_app_Acronym]);
  if (row1.length === 0) {
    return res.json({
      code: "AM001",
    });
  }
  /*
   * We are checking if the user has access to the application
   * If the user does not have access, we will send an error response
   * The error code AM002 is for user does not have access to the application
   */
  const permit = row1[0].App_permit_create;
  if (permit === null || permit === undefined) {
    return res.json({
      code: "AM002",
    });
  }
  const user_groups = user.group_list.split(",");
  //Check if any of the user's groups is included in the permit array, then the user is authorized. The group has to match exactly
  //for each group in the group array, check match exact as group parameter
  const authorised = user_groups.includes(permit);
  //Since permit can only have one group, we just need to check if the user's groups contains the permit
  if (!authorised) {
    return res.json({
      code: "AM002",
    });
  }
  //We need to handle the optional parameters, if they are not provided, we will set them to null
  if (!Task_description) {
    Task_description = null;
  }
  const Task_notes = "Task created by " + user.username + " on " + new Date().toISOString().slice(0, 10);
  const Task_id = Task_app_Acronym + (row1[0].App_Rnumber + 1);
  //Generate Task_state
  const Task_state = "Open";

  //Generate Task_creator
  const Task_creator = user.username;

  //Generate Task_owner
  const Task_owner = user.username;
  //Generate Task_createDate, the date is in the format YYYY-MM-DD HH:MM:SS. This is using current local time
  const Task_createDate = new Date().toISOString().slice(0, 19).replace("T", " ");

  //Insert task into database
  if (Task_name === "") {
    return res.json({
      code: "T003",
    });
  }
  const result = await connection
    .promise()
    .execute(
      "INSERT INTO task (Task_name, Task_description, Task_notes, Task_id, Task_plan, Task_app_acronym, Task_state, Task_creator, Task_owner, Task_createDate) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [Task_name, Task_description, Task_notes, Task_id, null, Task_app_Acronym, Task_state, Task_creator, Task_owner, Task_createDate]
    );
  if (result[0].affectedRows === 0) {
    return res.json({
      code: "T003",
    });
  }

  //Increment the application R number
  const newApp_Rnumber = row1[0].App_Rnumber + 1;
  const result2 = await connection
    .promise()
    .execute("UPDATE application SET App_Rnumber = ? WHERE App_Acronym = ?", [newApp_Rnumber, Task_app_Acronym]);
  if (result2[0].affectedRows === 0) {
    return res.json({
      code: "T003",
    });
  }
  return res.json({
    code: "S001",
    Task_id: Task_id,
  });
};

exports.GetTaskbyState = async (req, res) => {
  const { username, password, Task_state, Task_app_Acronym, Task_notes } = req.body;
  /*
   * We are checking if the mandatory fields (username, password, Task_state, Task_app_Acronym) are present in the request parameters
   * If they are not present, we will send an error response
   * The error code PS001 is for missing parameters
   */
  if (username === undefined || password === undefined || Task_state === undefined || Task_app_Acronym === undefined) {
    return res.json({
      code: "PS001",
    });
  }
  /*
   * We are checking if they are valid data types
   * If they are not valid, we will send an error response
   * The error code PS002 is for invalid field data types
   */
  if (typeof username !== "string" || typeof password !== "string" || typeof Task_state !== "string" || typeof Task_app_Acronym !== "string") {
    return res.json({
      code: "PS002",
    });
  }
  /*
   * We are checking if the username and password are correct
   * If they are not correct, we will send an error response
   * The error code IM001 is for incorrect username or password
   */
  const user = await validateUser(username, password, connection);
  if (!user) {
    return res.json({
      code: "IM001",
    });
  }
  /*
   * We are checking if the user account is active
   * If it is not active, we will send an error response
   * The error code IM002 is for inactive user account
   */
  if (user.is_disabled === 1) {
    return res.json({
      code: "IM002",
    });
  }
  /*
   * We are checking if the application exists
   * If it does not exist, we will send an error response
   * The error code AM001 is for application does not exist
   */
  const [row1, fields1] = await connection.promise().query("SELECT * FROM application WHERE app_acronym = ?", [Task_app_Acronym]);
  if (row1.length === 0) {
    return res.json({
      code: "AM001",
    });
  }

  /*
   * We are checking if the task state is valid or no.
   * If it is not valid, we will send an error response. Valid task states are Open, ToDo, Doing, Done, Close
   * The error code TS001 is for invalid task state
   */
  if (Task_state !== "Open" && Task_state !== "ToDo" && Task_state !== "Doing" && Task_state !== "Done" && Task_state !== "Close") {
    return res.json({
      code: "T002",
    });
  }
  let [row2, fields2] = [null, null];
  try {
    [row2, fields2] = await connection
      .promise()
      .query("SELECT * FROM task WHERE Task_state = ? AND Task_app_acronym = ?", [Task_state, Task_app_Acronym]);
  } catch (error) {
    return res.json({
      code: "T003",
    });
  }

  return res.json({
    code: "S001",
    data: row2,
  });
};

exports.PromoteTask2Done = async (req, res) => {
  const { username, password, Task_id, Task_app_Acronym } = req.body;
  /*
   * We are checking if the mandatory fields (username, password, Task_id) are present in the request parameters
   * If they are not present, we will send an error response
   * The error code PS001 is for missing parameters
   */
  if (username === undefined || password === undefined || Task_id === undefined || Task_app_Acronym === undefined) {
    return res.json({
      code: "PS001",
    });
  }
  /*
   * We are checking if they are valid data types
   * If they are not valid, we will send an error response
   * The error code PS002 is for invalid field data types
   */
  if (typeof username !== "string" || typeof password !== "string" || typeof Task_id !== "string" || typeof Task_app_Acronym !== "string") {
    return res.json({
      code: "PS002",
    });
  }
  /*
   * We are checking if the username and password are correct
   * If they are not correct, we will send an error response
   * The error code IM001 is for incorrect username or password
   */
  const user = await validateUser(username, password, connection);
  if (!user) {
    return res.json({
      code: "IM001",
    });
  }
  /*
   * We are checking if the user account is active
   * If it is not active, we will send an error response
   * The error code IM002 is for inactive user account
   */
  if (user.is_disabled === 1) {
    return res.json({
      code: "IM002",
    });
  }
  /*
   * We are checking if the application and task exists
   * If it does not exist, we will send an error response
   * The error code TM001 is for task does not exist
   */

  const [row2, fields2] = await connection.promise().query("SELECT * FROM application WHERE app_acronym = ?", [Task_app_Acronym]);
  if (row2.length === 0) {
    return res.json({
      code: "AM001",
    });
  }

  const nextState = "Done";
  const havePermit = row2[0].App_permit_Doing;

  if (havePermit === null || havePermit === undefined) {
    return res.json({
      code: "AM002",
    });
  }
  const user_groups = user.group_list.split(",");
  //Check if any of the user's groups is included in the permit array, then the user is authorized. The group has to match exactly
  //for each group in the group array, check match exact as group parameter
  const authorised = user_groups.includes(havePermit);
  //Since permit can only have one group, we just need to check if the user's groups contains the permit
  if (!authorised) {
    return res.json({
      code: "AM002",
    });
  }

  const [row1, fields1] = await connection.promise().query("SELECT * FROM task WHERE Task_id = ?", [Task_id]);
  if (row1.length === 0) {
    return res.json({
      code: "T001",
    });
  }
  const Task_state = row1[0].Task_state;

  if (Task_state !== "Doing") {
    return res.json({
      code: "T002",
    });
  }

  //Get the Task_owner from the req.user.username
  const Task_owner = user.username;

  let Added_Task_notes;
  if (req.body.Task_notes === undefined || req.body.Task_notes === null || req.body.Task_notes === "") {
    //append {Task_owner} moved {Task_name} from {Task_state} to {nextState} to the end of Task_note
    Added_Task_notes =
      Task_owner +
      " moved " +
      row1[0].Task_name +
      " from " +
      Task_state +
      " to " +
      nextState +
      " on " +
      new Date().toISOString().slice(0, 19).replace("T", " ");
  } else {
    //Get the Task_notes from the req.body.Task_notes and append {Task_owner} moved {Task_name} from {Task_state} to {nextState} to the end of Task_note
    Added_Task_notes =
      Task_owner +
      " moved " +
      row1[0].Task_name +
      " from " +
      Task_state +
      " to " +
      nextState +
      " on " +
      new Date().toISOString().slice(0, 19).replace("T", " ") +
      "\n" +
      req.body.Task_notes;
  }

  //Append Task_notes to the preexisting Task_notes, I want it to have two new lines between the old notes and the new notes
  const Task_notes = Added_Task_notes + "\n\n" + row1[0].Task_notes;
  //Update the task
  const result = await connection
    .promise()
    .execute("UPDATE task SET Task_notes = ?, Task_state = ?, Task_owner = ? WHERE Task_id = ?", [Task_notes, nextState, Task_owner, Task_id]);
  if (result[0].affectedRows === 0) {
    return res.json({
      code: "T003",
    });
  }

  if (Task_state === "Doing" && nextState === "Done") {
    sendEmailToProjectLead(row1[0].Task_name, row1[0].Task_app_Acronym);
  }

  return res.json({
    code: "S001",
  });
};

// Function to check if the username and pw provided matches against the database
const validateUser = async (username, password, connection) => {
  const [row, fields] = await connection.promise().query("SELECT * FROM user WHERE username = ?", [username]);
  if (row.length === 0) {
    return;
  }
  //we need to hash the password and compare it with the hashed password in the database
  const isPasswordMatched = await bcrypt.compare(password, row[0].password);
  if (!isPasswordMatched) {
    return;
  }

  return row[0];
};

async function sendEmailToProjectLead(taskName, Task_app_acronym) {
  //We need to pull the App_permit_Done group
  const [row, fields] = await connection.promise().query("SELECT * FROM application WHERE App_Acronym = ?", [Task_app_acronym]);

  const group = row[0].App_permit_Done;

  //We need to pull the emails of all users
  const [row2, fields2] = await connection.promise().query("SELECT * FROM user");
  const users = row2;

  //We need to pull the emails of all users that are in the group
  let emails = [];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const user_groups = user.group_list.split(",");
    if (user_groups.includes(group)) {
      //check if email is null or undefined
      if (user.email !== null && user.email !== undefined) {
        emails.push(user.email);
      }
    }
  }

  // Set up transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Define mail options
  const mailOptions = {
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: emails, // Replace with the actual project lead's email
    subject: `Task Promotion Notification`,
    text: `The task "${taskName}" has been promoted to "Done".`,
  };

  // Send the email
  try {
    transporter.sendMail(mailOptions);
    console.log("Email sent successfully.");
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
