import { D1ListEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { ProductModel } from "./base";

export class ProductList extends D1ListEndpoint<HandleArgs> {
    _meta = {
        model: ProductModel,
    };
}

export default ProductList;
