import mongoose from "mongoose";
import slugify from "slugify";
import tourModel from "./src/models/tourModel.js";
import "dotenv/config";
const langs = ["en", "ar", "es"];

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("MongoDB connected.");
};

const slugifyArabic = (text) => {
  return text
    .trim()
    .replace(/[؟،!.,;:"'«»()]/g, "") // remove Arabic punctuation and symbols
    .replace(/\s+/g, "-"); // replace spaces with dashes
};
const generateLocalizedSlug = async (title, lang, tourId) => {
  let baseSlug;

  if (lang === "ar") {
    baseSlug = slugifyArabic(title);
  } else {
    baseSlug = slugify(title, {
      lower: true,
      locale: lang,
      trim: true,
      remove: /[*+~.()'"!:@،؟]/g, // optional cleanup for all
    });
  }

  let slug = baseSlug;
  let count = 1;

  // Ensure uniqueness
  while (
    await tourModel.findOne({
      [`slug.${lang}`]: slug,
      _id: { $ne: tourId },
    })
  ) {
    slug = `${baseSlug}-${count}`;
    count++;
  }

  return slug;
};

// Migration logic
const migrateSlugs = async () => {
  const langs = ["en", "ar", "es"];
  const tours = await tourModel.find();

  for (const tour of tours) {
    const newSlug = {};

    for (const lang of langs) {
      const title = tour.title?.[lang];

      if (title) {
        const generatedSlug = await generateLocalizedSlug(title, lang, tour._id);
        newSlug[lang] = generatedSlug;
      }
    }

    tour.slug = newSlug;

    try {
      await tour.save();
      console.log(`✅ Slugs updated for tour: ${tour._id}`);
    } catch (err) {
      console.error(`❌ Failed to update tour ${tour._id}:`, err.message);
    }
  }

  console.log("🎉 All slugs migrated.");
};

// Run script
const run = async () => {
  try {
    await connectDB();
    await migrateSlugs();
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    mongoose.disconnect();
  }
};

run();