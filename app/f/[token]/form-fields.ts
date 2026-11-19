// Shared by the customer form and its server action (a "use server" file can
// only export async functions, so these constants live here).

/** Select value meaning "something else" for fields with allowOther. */
export const OTHER_OPTION = "__other__";

/** Name of the free-text box shown when OTHER_OPTION is picked. */
export const otherInputName = (key: string) => `${key}__other`;
