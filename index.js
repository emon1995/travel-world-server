const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
    origin: "*",
    credentials: true,
    optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.idgt1xz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const userCollection = client.db("travelWorldDB").collection("users");
        const groupCollection = client.db("travelWorldDB").collection("groups");
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // jwt token
        app.post("/jwt", (req, res) => {
            try {
                const user = req.body;
                // console.log(user);
                const token = jwt.sign(user, process.env.JWT_SECRET_KEY, { expiresIn: "10d" });
                return res.send({ token });
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // user port route
        app.post("/users", async (req, res) => {
            try {
                const user = req.body;
                const query = { email: user.email };
                const existingUser = await userCollection.findOne(query);
                if (existingUser) {
                    return res.send({ message: "user already exist" });
                }
                const result = await userCollection.insertOne(user);
                res.send(result);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // create group route
        app.post("/groups/:email", async (req, res) => {
            try {
                const groupName = req.body;
                const email = req.params.email;

                const filter = { email: email };
                const updateDoc = {
                    $set: {
                        role: "admin",
                        admin: true
                    }
                }
                const updateUser = await userCollection.updateOne(filter, updateDoc);
                const result = await groupCollection.insertOne(groupName);
                return res.send(result);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // get groups route
        app.get("/groups", async (req, res) => {
            try {
                const result = await groupCollection.find({}).toArray();
                return res.send(result);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // join groups route
        app.patch("/join-groups/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const body = req.body;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        membersEmail: body
                    }
                }
                const result = await groupCollection.updateOne(filter, updateDoc);
                return res.send(result);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    return res.send("Hello world");
})

app.listen(port, () => {
    console.log(`Travel World Server is running on port ${port}`);
})