import { z } from "zod";

export const product = z.object({
  id: z.number().int(),
  url: z.string().url(),
  price: z.number().nullable(),
  last_check: z.string().datetime().nullable(),
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
