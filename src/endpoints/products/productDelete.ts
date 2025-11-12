import { D1DeleteEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { ProductModel } from "./base";

export class ProductDelete extends D1DeleteEndpoint<HandleArgs> {
    _meta = {
        model: ProductModel,
        summary: "Delete a product",
        description: "Remove a product from tracking by its ID",
    };
}

export default ProductDelete;