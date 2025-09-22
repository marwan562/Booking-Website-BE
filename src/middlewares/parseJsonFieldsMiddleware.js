export function parseJsonFields(req, res, next) {
  const fieldsToParse = [
    "title",
    "description",
    "category",
    "historyBrief",
    "location",
    "date",
    "features",
    "includes",
    "notIncludes",
    "tags",
    "repeatTime",
    "repeatDays",
    "options",
    "adultPricing",
    "childrenPricing",
    "itinerary",
    "city",
    "country",
    "imagesToDelete",
    "imagesToKeep",
  ];

  for (const field of fieldsToParse) {
    const value = req.body[field];

    if (value && typeof value === "string") {
      try {
        req.body[field] = JSON.parse(value);
      } catch (err) {
        console.error(`Failed to parse ${field}:`, value);
        return res.status(400).json({
          status: "fail",
          message: `Invalid JSON in field "${field}"`,
        });
      }
    } else if (value && typeof value === "object") {
      continue;
    }
  }

  next();
}
