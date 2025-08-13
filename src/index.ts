import express, { NextFunction, Request, Response } from 'express';
import { config } from './config.js';
import { BadRequestError, NotFoundError, UserForbiddenError, UserNotAuthenticatedError } from './errors.js';

const app = express();
const PORT = 8080;

app.use(middlewareLogResponse);
app.use(express.json());
app.use('/app', middlewareMetricsInc, express.static('./src/app'), );
app.get('/api/healthz', (req,res,next) => {
  Promise.resolve(handlerReadiness(req,res).catch(next));
});
app.get('/admin/metrics', (req,res,next)=>{
  Promise.resolve(handlerRequestCounter(req,res).catch(next));
});
app.post('/admin/reset', (req,res,next) => {
  Promise.resolve(handlerResetRequestCounter(req,res).catch(next));
});
app.post('/api/validate_chirp', (req,res,next) => {
  Promise.resolve(handlerValidateChirp(req,res).catch(next));
});
app.use(middlewareErrorHandler);
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

async function handlerReadiness(req:Request, res:Response){
  res.set('Content-Type', 'text/text; charset=utf-8');
  res.status(200).send("OK");
};

async function handlerRequestCounter(req:Request, res: Response){
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.status(200)
  res.write(`
    <html>
    <body>
      <h1>Welcome, Chirpy Admin</h1>
      <p>Chirpy has been visited ${config.fileserverHits} times!</p>
    </body>
    </html>`
  );
  res.send();
}

async function handlerResetRequestCounter(req:Request, res: Response){
  res.set('Content-Type', 'text/plain; charset=utf-8');
  config.fileserverHits = 0;
  res.status(200).send(`Hits: ${config.fileserverHits}`);
}

async function handlerValidateChirp(req: Request, res: Response) {
  const maxChirpLength = 140;
  type RequestParameters = {
    body: string;
  };

  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  let reqParams: RequestParameters;
 
  reqParams = req.body
  
  if (reqParams.body.length > maxChirpLength) {
     throw new BadRequestError(
      `Chirp is too long. Max length is ${maxChirpLength}`,
  );
  }
    
  const words = reqParams.body.split(" ");

  const badWords = ["kerfuffle", "sharbert", "fornax"];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const loweredWord = word.toLowerCase();
    if (badWords.includes(loweredWord)) {
        words[i] = "****";
    }
  }

  const cleaned = words.join(" ");
  res.header("Content-Type", "application/json");
  const responseBody = JSON.stringify({
      cleanedBody: cleaned,
  });
  res.status(200).send(responseBody);
  res.end();
}

function middlewareLogResponse(req:Request, res:Response, next: NextFunction){
  res.on("finish", () => {
    if(res.statusCode !== 200){
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`)
    }
  });
  next();
};

function middlewareMetricsInc(req: Request, res: Response, next: NextFunction){
  res.on("finish", () => {
    config.fileserverHits++;
  });
  next();
}

function middlewareErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
   let statusCode = 500;
  let message = "Something went wrong on our end";

  if (err instanceof BadRequestError) {
    statusCode = 400;
    message = err.message;
  } else if (err instanceof UserNotAuthenticatedError) {
    statusCode = 401;
    message = err.message;
  } else if (err instanceof UserForbiddenError) {
    statusCode = 403;
    message = err.message;
  } else if (err instanceof NotFoundError) {
    statusCode = 404;
    message = err.message;
  }

  if (statusCode >= 500) {
    console.log(err.message);
  }
  res.header("Content-Type", "application/json");
  const body = JSON.stringify({error: message});
  res.status(statusCode).send(body);
  res.end();
}