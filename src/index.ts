import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { productsRouter } from "./endpoints/products/router";
import { CheckProducts } from "./endpoints/products/check";
import { runCheck } from "./services/checker";
import { ContentfulStatusCode } from "hono/utils/http-status";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
	if (err instanceof ApiException) {
		// If it's a Chanfana ApiException, let Chanfana handle the response
		return c.json(
			{ success: false, errors: err.buildResponse() },
			err.status as ContentfulStatusCode,
		);
	}

	console.error("Global error handler caught:", err); // Log the error if it's not known

	// For other errors, return a generic 500 response
	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error" }],
		},
		500,
	);
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
	schema: {
		info: {
			title: "Price Tracker API",
			version: "1.0.0",
			description: "Amazon price tracker with Telegram notifications",
		},
	},
});

// Register Products Sub router
openapi.route("/products", productsRouter);

// Register check endpoint
openapi.get("/check", CheckProducts);

// Export the Hono app
export default app;

// Scheduled handler (cron) will call runCheck. Cloudflare scheduled handler signature: (controller, env)
export async function scheduled(controller: any, env: Env) {
	// runCheck will update DB and send Telegram notifications where relevant
	controller.waitUntil(runCheck(env));
}
