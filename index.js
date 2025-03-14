const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(bodyParser.json());

const SECRET_KEY = "pookie :>";
let users = {};
let messages = {};
let userDB = [{username: "patrick", password: "Passord1"},{username: "admin", password: "admin"},{username: "testuser", password: "test123!"}];

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if(!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    const user = userDB.find(u => u.username === username)
    if(!user) {
        return res.status(401).json({ message: "Invalid username." });
    }

    if(user.password !== password) {
        return res.status(401).json({ message: "Invalid password." });
    }

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "10m" });
    res.status(200).json({ message: "Login successful.", token });
});

app.post("/register", (req, res) => {
    const { username, password } = req.body;

    if(!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    const userExists = userDB.some(u => u.username === username);
    if (userExists) {
        return res.status(409).json({ error: "Account already exists." });
    }

    userDB.push({ username: username, password: password });
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "10m" });
    res.status(200).json({ message: "Register successful.", token });

    console.log(userDB);
});

function authenticateSocket(socket, next) {
    const token = socket.handshake.auth?.token;

    if(!token) {
        return next(new Error("Authentication error: No token provided."));
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if(err) {
            return next(new Error("Authentication error: Invalid token."));
        }

        socket.username = decoded.username;
        next();
    });
}

io.use(authenticateSocket);

io.on("connection", (socket) => {
    socket.on("set-username", (username) => {
        users[socket.id] = username;
        console.log(`Username set for ${socket.id}: ${username}`);
    });

    socket.on("message", (data) => {
        const { user, text } = data;
        io.emit("message", { user, text });
        messages["message"] = data;
        console.log(messages)
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id, `(${users[socket.id]})`);
        delete users[socket.id];
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
