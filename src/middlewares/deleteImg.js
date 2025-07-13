import cloudinary from "cloudinary";

export function removeImage(publicId) {
  const public_ids = [...arguments];
  public_ids.map((id) => {
    cloudinary.api.delete_resources(id, { folder: "websites" });
  });
}

