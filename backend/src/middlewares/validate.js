export const validate = (schemas) => (req, _res, next) => {
    req.validated = {};

    if (schemas.params){
        req.validated.params = schemas.params.parse(req.params);
    }

    if (schemas.query){
        req.validated.query = schemas.query.parse(req.query);
    }

    if (schemas.body){
        req.validated.body = schemas.body.parse(req.body);
    }

    next();
};
