import { json } from "hono";
import { AppContext } from "../../types";

export const ProductCreate = async (c: AppContext) => {
  const body = await c.req.json().catch(() => ({}));
  const url = (body && body.url) ? String(body.url).trim() : "";

  if (!url) {
    return c.json({ success: false, error: "Missing 'url' in body" }, 400);
  }

  // Basic validation: require amazon in URL (reasonable assumption)
  if (!/amazon\./i.test(url)) {
    return c.json({ success: false, error: "URL must be an Amazon product URL" }, 400);
  }

  try {
    await c.env.DB.prepare(
      `INSERT INTO products (url, price, last_check) VALUES (?, NULL, NULL)`,
    ).bind(url).run();

    // Return the newly created row (query by url, latest id)
    const row = await c.env.DB.prepare(
      `SELECT id, url, price, last_check FROM products WHERE url = ? ORDER BY id DESC LIMIT 1`,
    ).bind(url).all();

    return c.json({ success: true, product: row.results?.[0] ?? null });
  } catch (err: any) {
    console.error("ProductCreate error", err);
    return c.json({ success: false, error: String(err?.message ?? err) }, 500);
  }
};

export default ProductCreate;
