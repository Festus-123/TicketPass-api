import express from "express";

const app = express()
const poPORTrt = process.env.PORT || 3000

app.listen(port, () => console.log(`Server listening on port ${port}`))