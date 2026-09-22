class ApiError extends Error {
    constructor(statusCode ,code, message, details = null) {
        super(message);

        this.name = "ApiError"

        this.statusCode = statusCode;
        this.code = code;
        this.details = details;

        if(Error.captureStackTrace){
            Error.captureStackTrace(this, ApiError);
        }
    }
}

export default ApiError;