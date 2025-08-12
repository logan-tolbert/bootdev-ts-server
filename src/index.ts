import express, { NextFunction, Request, Response } from 'express';
import { config } from './config.js';

const app = express();
const PORT = 8080;

app.use(middlewareLogResponse);
app.use('/app', middlewareMetricsInc, express.static('./src/app'), );
app.get('/api/healthz', handlerReadiness);
app.get('/admin/metrics', handlerRequestCounter);
app.get('/admin/reset', handlerResetRequestCounter);
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

function handlerReadiness(req:Request, res:Response):void{
  res.set('Content-Type', 'text/text; charset=utf-8');
  res.status(200).send("OK");
};

function handlerRequestCounter(req:Request, res: Response):void{
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

function handlerResetRequestCounter(req:Request, res: Response):void{
  res.set('Content-Type', 'text/plain; charset=utf-8');
  config.fileserverHits = 0;
  res.status(200).send(`Hits: ${config.fileserverHits}`);
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