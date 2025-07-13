import { v2 as cloudinary } from "cloudinary";

export function removeImage(...publicIds) {
  if (!publicIds.length) return;

  cloudinary.api.delete_resources(publicIds.map(id => `websites/${id}`), (error, result) => {
    if (error) {
      console.error("Error deleting images from Cloudinary:", error);
    } else {
      console.log("Deleted images:", result);
    }
  });
}
