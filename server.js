const Chill = require("./chill");

const server = new Chill();

let USERS = [
	{ id: 1, name: "Ana Silva", username: "anasilva", password: "123456" },
	{ id: 2, name: "Bruno Costa", username: "brunocosta", password: "123456" },
	{ id: 3, name: "Carla Souza", username: "carlasouza", password: "123456" },
	{ id: 4, name: "Diego Lima", username: "diegolima", password: "123456" },
	{ id: 5, name: "Elisa Rocha", username: "elisarocha", password: "123456" },
];

let SESSIONS = [];

let POSTS = [
	{
		id: 1,
		title: "First post",
		body: "Content of the first post.",
		userId: 1,
	},
	{
		id: 2,
		title: "Second post",
		body: "Content of the second post.",
		userId: 2,
	},
	{
		id: 3,
		title: "Third post",
		body: "Content of the third post.",
		userId: 3,
	},
	{
		id: 4,
		title: "Fourth post",
		body: "Content of the fourth post.",
		userId: 4,
	},
	{
		id: 5,
		title: "Fifth post",
		body: "Content of the fifth post.",
		userId: 5,
	},
];

const authMiddleware = (req, res, next) => {
	const cookieHeader = req.headers?.cookie || "";
	const token = cookieHeader
		.split(";")
		.map((c) => c.trim())
		.find((c) => c.startsWith("token="))
		?.substring("token=".length);

	if (!token) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const session = SESSIONS.find((s) => s.token === token);

	if (!session) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const existingUser = USERS.find((u) => u.id === session.userId);

	if (!existingUser) {
		return res.status(401).json({ message: "User not found." });
	}

	req.token = token;
	req.user = existingUser;

	next();
};

server.beforeEach((req, res, next) => {
	if (req.headers["content-type"] === "application/json") {
		let bodyData = "";

		req.on("data", (chunk) => {
			bodyData += chunk.toString();
		});

		req.on("end", () => {
			if (bodyData) {
				try {
					req.body = JSON.parse(bodyData);
				} catch (e) {
					console.error("JSON parse error", e);
				}
			}
			next();
		});
	} else {
		next();
	}
});

server.listen(3000, null, () => console.log("Server is running..."));

server.route("get", "/", (req, res) => {
	res.sendFile("./public/index.html", "text/html");
});

server.route("get", "/styles.css", (req, res) => {
	res.sendFile("./public/styles.css", "text/css");
});

server.route("get", "/scripts.js", (req, res) => {
	res.sendFile("./public/scripts.js", "application/javascript");
});

server.route("get", "/api/user", authMiddleware, (req, res) => {
	res.status(200).json(req.user);
});

server.route("get", "/api/users", (req, res) => {
	res.status(200).json(USERS);
});

server.route("get", "/api/posts", (req, res) => {
	res.status(200).json(
		POSTS.map((p) => {
			const user = USERS.find((u) => u.id === p.userId);
			return { ...p, author: user.username };
		}),
	);
});

server.route("delete", "/api/logout", authMiddleware, (req, res) => {
	SESSIONS = SESSIONS.filter((s) => s.userId !== req.user.id);
	res.status(200).json({ message: "Logged out sucessfuly." });
});

server.route("post", "/api/login", (req, res) => {
	const { username, password } = req.body;

	if (!username) {
		return res.status(400).json({ message: "Username is required." });
	}

	if (!password) {
		return res.status(400).json({ message: "Password is required." });
	}

	const existingUser = USERS.find(
		(u) => u.username === username && u.password === password,
	);

	if (!existingUser) {
		return res.status(401).json({ message: "Invalid credentials." });
	}

	const token = Math.floor(Math.random() * 120421498).toString();

	SESSIONS.push({ userId: existingUser.id, token: token });

	res.setHeader("Set-Cookie", `token=${token}; Path=/;`);

	res.status(200).json(existingUser);
});

server.route("post", "/api/posts", authMiddleware, (req, res) => {
	const { title, body } = req.body;

	if (!title) {
		return res.status(400).json({ message: "Title is required." });
	}

	if (!body) {
		return res.status(400).json({ message: "Body is required." });
	}

	const userId = req.user.id;

	const newPost = {
		id: Math.floor(Math.random() * 1023268),
		title,
		body,
		userId,
	};

	POSTS.push(newPost);

	res.status(201).json(newPost);
});

server.route("put", "/api/posts", authMiddleware, (req, res) => {
	const { title, body, postId } = req.body;

	if (!title) {
		return res.status(400).json({ message: "title is required." });
	}

	if (!body) {
		return res.status(400).json({ message: "body is required." });
	}

	if (!postId) {
		return res.status(400).json({ message: "postId is required." });
	}

	const userId = req.user.id;

	const post = POSTS.find((p) => p.id === postId && p.userId === userId);

	if (!post) {
		return res.status(404).json({ message: "Not found." });
	}

	post.title = title;
	post.body = body;

	res.status(201).json(post);
});
