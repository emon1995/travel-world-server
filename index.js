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

// middleware verify token
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: "unauthorized" });
    }
    const token = authorization.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: "unauthorized" });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const userCollection = client.db("travelWorldDB").collection("users");
        const groupCollection = client.db("travelWorldDB").collection("groups");
        const postCollection = client.db("travelWorldDB").collection("posts");
        const commentCollection = client.db("travelWorldDB").collection("comments");
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

        // verify admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.admin !== true) {
                return res.status(403).send({ error: true, message: "forbidden access" });
            }
            next();
        }

        // verify members
        const verifyMembers = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== "member") {
                return res.status(403).send({ error: true, message: "forbidden access" });
            }
            next();
        }

        // admin route role
        app.get("/users/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const query = { email: email };
                const user = await userCollection.findOne(query);
                if (user?.role === "admin") {
                    const result = { role: user?.role };
                    return res.send(result);
                } else if (user?.role === "member") {
                    const result = { role: user?.role };
                    return res.send(result);
                }
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

        // get single group route
        app.get("/group/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await groupCollection.findOne(query);
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
                    $push: {
                        membersInfo: { ...body, _id: new ObjectId() }
                    }
                }
                const result = await groupCollection.updateOne(filter, updateDoc);
                return res.send(result);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // posts all get route
        app.get("/posts", async (req, res) => {
            try {
                const result = await postCollection.find({}).toArray();
                return res.send(result);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // single get post route
        app.get("/post/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await postCollection.findOne(query);
                return res.send(result);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // posts create route post
        app.post("/posts", async (req, res) => {
            try {
                const posts = req.body;
                const result = await postCollection.insertOne(posts);
                return res.send(result);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // get all comments route
        app.get("/comments", async (req, res) => {
            try {
                const result = await commentCollection.find({}).toArray();
                return res.send(result);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // post comment route create
        app.post("/comments", async (req, res) => {
            try {
                const body = req.body;
                const result = await commentCollection.insertOne(body);
                return res.send(result);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // manage member route
        app.get("/manage-member", verifyJWT, verifyAdmin, async (req, res) => {
            try {
                const members = await groupCollection.find({}).toArray();
                // const query = { email: members.map(member => member?.membersEmail?.memberEmail) }
                // console.log(query, members);
                // const result = await userCollection.find(query).toArray();
                return res.send(members);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        app.delete("/manage-member/:id", verifyJWT, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const { groupId } = req.query;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    _id: new ObjectId(groupId)
                }
                const member = await groupCollection.updateOne(filter, { $pull: { membersInfo: updateDoc } });

                return res.send(member);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // posts all get route
        app.get("/manage-posts", verifyJWT, verifyAdmin, async (req, res) => {
            try {
                const result = await postCollection.find({}).toArray();
                return res.send(result);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // admin can approved & denied patch route
        app.patch("/manage-posts/:id", verifyJWT, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const query = req.query;
                const filter = { _id: new ObjectId(id) };
                const updatedDoc = {
                    $set: {
                        status: query?.status
                    }
                }
                // console.log(query, id);
                if (query?.status === "approved") {
                    const result = await postCollection.updateOne(filter, updatedDoc);
                    return res.send(result);
                } else if (query?.status === "denied") {
                    const result = await postCollection.updateOne(filter, updatedDoc);
                    return res.send(result);
                }
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // admin edit route
        app.patch("/manage-group/edit/:id", verifyJWT, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const groupName = req.body;
                // console.log(groupName);
                const filter = { _id: new ObjectId(id) };
                const updatedDoc = {
                    $set: groupName
                }
                const result = await groupCollection.updateOne(filter, updatedDoc);
                return res.send(result);
            } catch (error) {
                return res.send({ message: error.message });
            }
        })

        // admin group delete route
        app.delete("/manage-group/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await groupCollection.deleteOne(query);
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