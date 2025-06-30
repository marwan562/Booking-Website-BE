import sharp from "sharp";
const convertToWebp = async (buffer) => {
  return await sharp(buffer).webp({ quality: 80 }).toBuffer();
};

export default convertToWebp;