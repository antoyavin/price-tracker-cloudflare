import { D1CreateEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { ProductModel } from "./base";

export class ProductCreate extends D1CreateEndpoint<HandleArgs> {
    _meta = {
        model: ProductModel,
        fields: ProductModel.schema.pick({ url: true }),
        summary: "Add a new product to track",
        description: "Create a new product by providing an Amazon product URL",
    };
}

export default ProductCreate;