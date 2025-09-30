import mongoose, { Schema } from "mongoose";
import slugify from "slugify";

const localizedSchema = new Schema(
  {
    en: { type: String, required: true },
    es: { type: String, required: true },
    fr: { type: String, required: false },
  },
  { _id: false }
);

const schema = new Schema(
  {
    city: { type: localizedSchema, required: true },
    country: { type: localizedSchema, required: true },
    slug: {
      type: { country: localizedSchema, city: localizedSchema },
      required: false,
      index: true,
    },
    mainImg: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    description: { type: localizedSchema },
    popular: { type: Boolean, default: false },
    totalTravelers: { type: Number, default: 0 },
    totalTours: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
  },
  { timestamps: true }
);

schema.index({ popular: 1 });
schema.index({ country: 1, "city.en": 1 }, { unique: true });
schema.index({ "city.en": 1 });
schema.index({ country: 1 });
schema.index({ "slug.country.en": 1, "slug.city.en": 1 }, { unique: true });
schema.index({ "slug.country.es": 1, "slug.city.es": 1 }, { unique: true });
schema.index({ "slug.country.fr": 1, "slug.city.fr": 1 }, { unique: true });

schema.pre("save", function (next) {
  if (this.country) {
    if (this.country.en) this.country.en = this.country.en.trim().toLowerCase();
    if (this.country.es) this.country.es = this.country.es.trim().toLowerCase();
    if (this.country.fr) this.country.fr = this.country.fr.trim().toLowerCase();
  }

  if (this.city) {
    if (this.city.en) this.city.en = this.city.en.trim().toLowerCase();
    if (this.city.es) this.city.es = this.city.es.trim().toLowerCase();
    if (this.city.fr) this.city.fr = this.city.fr.trim().toLowerCase();
  }

  next();
});

schema.pre("save", async function (next) {
  const langs = ["en", "es", "fr"];
  const isNewDoc = this.isNew;

  this.slug = this.slug || { country: {}, city: {} };

  for (const lang of langs) {
    if (
      this.country?.[lang] &&
      (this.isModified(`country.${lang}`) ||
        !this.slug.country?.[lang] ||
        isNewDoc)
    ) {
      let baseCountrySlug = slugify(this.country[lang], {
        lower: true,
        locale: lang,
        trim: true,
        remove: /[*+~.()'"!:@،؟]/g,
      });

      let countrySlug = baseCountrySlug;
      let count = 1;

      while (
        await this.constructor.findOne({
          [`slug.country.${lang}`]: countrySlug,
          _id: { $ne: this._id },
        })
      ) {
        countrySlug = `${baseCountrySlug}-${count}`;
        count++;
      }

      this.slug.country[lang] = countrySlug;
    }

    if (
      this.city?.[lang] &&
      (this.isModified(`city.${lang}`) || !this.slug.city?.[lang] || isNewDoc)
    ) {
      let baseCitySlug = slugify(this.city[lang], {
        lower: true,
        locale: lang,
        trim: true,
        remove: /[*+~.()'"!:@،؟]/g,
      });

      let citySlug = baseCitySlug;
      let count = 1;

      while (
        await this.constructor.findOne({
          [`slug.country.${lang}`]: this.slug.country[lang],
          [`slug.city.${lang}`]: citySlug,
          _id: { $ne: this._id },
        })
      ) {
        citySlug = `${baseCitySlug}-${count}`;
        count++;
      }

      this.slug.city[lang] = citySlug;
    }
  }

  next();
});

export default mongoose.model("destination", schema);
