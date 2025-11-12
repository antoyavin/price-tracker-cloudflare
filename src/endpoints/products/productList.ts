import { D1ListEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { ProductModel } from "./base";

export class ProductList extends D1ListEndpoint<HandleArgs> {
    _meta = {
        model: ProductModel,
        summary: "List all products",
        description: "Get all tracked products with their URLs, current prices, and last check times",
    };
}

export default ProductList;