import { Hono } from "hono";
import { fromHono } from "chanfana";
import { ProductCreate } from "./productCreate";
import { ProductList } from "./productList";
import { ProductDelete } from "./productDelete";

export const productsRouter = fromHono(new Hono());

productsRouter.get("/", ProductList);
productsRouter.post("/", ProductCreate);
productsRouter.delete("/:id", ProductDelete);
