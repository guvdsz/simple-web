const http = require("node:http");
const fs = require("node:fs/promises");

class Chill {
	#routes;
	#middlewares;

	constructor() {
		this.server = http.createServer();
		this.#routes = {};
		this.#middlewares = [];

		this.server.on("request", (req, res) => {
			res.status = (code) => {
				res.statusCode = code;
				return res;
			};

			res.json = (content) => {
				res.setHeader("Content-Type", "application/json");
				return res.end(JSON.stringify(content));
			};

			res.sendFile = async (path, mime) => {
				res.setHeader("Content-Type", mime);
				const fh = await fs.open(path, "r");
				const fhStream = fh.createReadStream();
				fhStream.pipe(res);

				fhStream.on("end", () => {
					fh.close();
				});
			};

			const routeFunction =
				this.#routes[req.method.toLocaleLowerCase() + req.url];

			if (!routeFunction) {
				res.status(404);
				return res.json({
					code: res.statusCode,
					message: `Cannot ${req.method} ${req.url}.`,
				});
			}

			let i = 0;
			const middlewares = this.#middlewares;

			const next = () => {
				if (i < middlewares.length) {
					const middleware = middlewares[i];
					const middlewareCb = middleware.cb;
					i++;
					if (middleware.path && middleware.method) {
						if (
							middleware?.path === req.url &&
							middleware?.method ===
								req.method.toLowerCase()
						) {
							middlewareCb(req, res, next);
						} else {
							next();
						}
					} else {
						middlewareCb(req, res, next);
					}
				} else {
					routeFunction(req, res);
				}
			};

			next();

			req.on("error", () => {
				res.status(400);
				res.json({
					error: "O corpo da requisição enviou um JSON inválido.",
				});
			});
		});
	}

	route(method, path, ...handlers) {
		// Remove e guarda a última função do array, que será o callback principal da rota
		const cb = handlers.pop();

		// O que sobrou na variável "handlers" são os middlewares (pode ser 0, 1 ou 10)
		const routeMiddlewares = handlers;

		// Registra cada middleware encontrado usando a sua lógica atual
		for (const middleware of routeMiddlewares) {
			this.#middlewares.push({ cb: middleware, path, method });
		}

		// Registra a rota normalmente
		this.#routes[method + path] = cb;
	}

	beforeEach(cb) {
		this.#middlewares.push({ cb, path: null, method: null });
	}

	status(code) {}

	listen(port, hostname, cb) {
		this.server.listen(port, (hostname = "127.0.0.1"), () => {
			cb();
		});
	}
}

module.exports = Chill;
