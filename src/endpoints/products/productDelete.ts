import { AppContext } from "../../types";

export const ProductDelete = async (c: AppContext) => {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, error: "Missing id" }, 400);

  try {
    await c.env.DB.prepare("DELETE FROM products WHERE id = ?").bind(Number(id)).run();
    return c.json({}, 204);
  } catch (err: any) {
    console.error("ProductDelete error", err);
    return c.json({ success: false, error: String(err?.message ?? err) }, 500);
  }
};

export default ProductDelete;
