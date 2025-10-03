export const clearPrefix = (req, res, next) => {
  if (typeof req.body.options === "string") {
    try {
      req.body.options = JSON.parse(req.body.options);
    } catch (err) {
    }
  }

  const cleanedBody = {};
  for (const key in req.body) {
    const cleanKey = key.replace(/^\d+_/, "");
    cleanedBody[cleanKey] = req.body[key];
  }

  if (typeof cleanedBody.passengers === "string") {
    try {
      cleanedBody.passengers = JSON.parse(cleanedBody.passengers);
    } catch (e) {}
  }

  if (Array.isArray(cleanedBody.passengers)) {
    req.files?.forEach((file) => {
      const match = file.fieldname.match(/^passengers\[(\d+)\]\[passport\]$/);
      if (match) {
        const passengerIndex = Number(match[1]);
        if (cleanedBody.passengers[passengerIndex]) {
          cleanedBody.passengers[passengerIndex].passport = file;
        }
      }
    });
  }
  req.body = cleanedBody;

  next();
};
