import { AppContext } from "../../types";
import { runCheck } from "../../services/checker";

export const CheckProducts = async (c: AppContext) => {
  try {
    const result = await runCheck(c.env);
    return c.json({ success: true, result });
  } catch (err: any) {
    console.error("CheckProducts error", err);
    return c.json({ success: false, error: String(err?.message ?? err) }, 500);
  }
};

export default CheckProducts;
