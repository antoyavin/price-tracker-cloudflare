import { AppContext } from "../../types";

export const ProductList = async (c: AppContext) => {
  try {
    const res = await c.env.DB.prepare(
      `SELECT id, url, price, last_check FROM products ORDER BY id DESC`,
    ).all();

    return c.json({ success: true, products: res.results ?? [] });
  } catch (err: any) {
    console.error("ProductList error", err);
    return c.json({ success: false, error: String(err?.message ?? err) }, 500);
  }
};

export default ProductList;
