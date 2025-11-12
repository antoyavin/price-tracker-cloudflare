import { z } from "zod";

export const product = z.object({
    id: z.number().int(),
    url: z.string().url("Must be a valid URL").describe("Amazon product URL to track"),
    price: z.number().nullable().describe("Current price in product currency"),
    last_check: z.string().datetime().nullable().describe("Timestamp of last price check"),
});

export const ProductModel = {
    tableName: "products",
    primaryKeys: ["id"],
    schema: product,
    serializer: (obj: Record<string, any>) => ({
        ...obj,
        price: obj.price == null ? null : Number(obj.price),
    }),
    serializerObject: product,
};

