const customErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res
      .status(statusCode)
      .send({
        err: err.message,
        statusCode,
        stack: process.env.NODE_ENV === "development" ? err.stack : null,
      });
  }


  export default customErrorHandler