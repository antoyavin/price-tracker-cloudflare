import { z } from "zod";

export const task = z.object({
	id: z.number().int(),
	name: z.string(),
	slug: z.string(),
	description: z.string(),
	completed: z.boolean(),
	due_date: z.string().datetime(),
});

export const TaskModel = {
	tableName: "tasks",
	primaryKeys: ["id"],
	schema: task,
	// serializer must accept a generic object shape to satisfy the endpoint Meta type
	serializer: (obj: any) => {
		return {
			...obj,
			completed: Boolean((obj as any).completed),
		} as object;
	},
	serializerObject: task,
};
