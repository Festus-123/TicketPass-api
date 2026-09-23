import express from "express";

const app = express()
const port = process.env.PORT || 3000

app.post("/api/v1/tickets", (req, res) => {
    // age = req.body(age)
    res.send(`Hi there what do you want ?? mr years old`)
})

app.listen(port, () => console.log(`Server listening on port ${port}`))
