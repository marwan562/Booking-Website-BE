import { catchAsyncError } from "../middlewares/catchAsyncError.js";

const changeCurrence = catchAsyncError(async () => {
  return fetch("https://api.exchangerate-api.com/v4/latest/USD")
    .then((response) => {
      return response.json(); // Parse JSON from the response
    })
    .then((data) => {
      return data;
    })
    .catch((err) => {
      console.log(err);
    });
});

export { changeCurrence };
