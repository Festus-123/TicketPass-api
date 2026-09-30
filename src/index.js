import app from "./app/app.js";

const port = process.env.PORT || 3000

app.listen(port, '0.0.0.0', () => 
  console.log(`TicketPass Api Running on port ${port}...`)
);
