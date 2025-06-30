export class AppError extends Error{
    constructor(message,statesCode){
        super(message);
        this.statesCode=statesCode
    }

}