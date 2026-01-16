const extractErrorMessages = (error: any): string[] => {
  const data = error?.response?.data;

  if (!data) return ["Something went wrong"];


  if (Array.isArray(data.detail)) {
    return data.detail.map((err: any) => err.msg || "Invalid input");
  }


  if (typeof data.detail === "string") {
    return [data.detail];
  }


  if (typeof data.message === "string") {
    return [data.message];
  }

  return ["Unexpected error occurred"];
};

export default extractErrorMessages
