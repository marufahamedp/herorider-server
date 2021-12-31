const express = require('express')
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const fileUpload = require('express-fileupload');

const port = process.env.PORT || 5000;

const serviceAccount = require('./hero-rider-maruf-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());
app.use(fileUpload());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jcoi8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('HeroRider');
        const projectsCollection = database.collection('projects');
        const usersCollection = database.collection('users');
        const servicesCollection = database.collection('services');
        const reviewsCollection = database.collection('reviews');
        const ordersCollection = database.collection('orders');

        //users 

        app.get('/users', async (req, res) => {
            const cursor = usersCollection.find({});
            const users = await cursor.toArray();
            res.json(users);
        });
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        app.post('/users', verifyToken, async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });

        app.put('/users', verifyToken, async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                console.log(req.decodedEmail);
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })



        app.get('/projects', async (req, res) => {
            const cursor = projectsCollection.find({});
            const project = await cursor.toArray();
            res.json(project);
        });

        app.get('/projects', async (req, res) => {
            const email = req.query.email;
            const date = req.query.date;
            const query = { email: email, date: date }
            const cursor = projectsCollection.find(query);
            const projects = await cursor.toArray();
            res.json(projects);
        })

        app.get('/projects/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await projectsCollection.findOne(query);
            res.json(result);
        })



        app.put('/projects/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment
                }
            };
            const result = await projectsCollection.updateOne(filter, updateDoc);
            res.json(result);
        });
        app.delete('/projects/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) };
            const review = await projectsCollection.deleteOne(query);
            res.json(review);
        })
        app.post('/projects', async (req, res) => {
            const name = req.body.name;
            const details = req.body.details;
            const postDate = req.body.postDate;
            const pic = req.files.image;
            const picData = pic.data;
            console.log(req.body);
            console.log('files', req.files);
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64');
            const projects = {
                name,
                details,
                postDate,
                image: imageBuffer
            }
            const result = await projectsCollection.insertOne(projects);
            res.json(result);
        })





        //services
        app.get('/services', async (req, res) => {
            const cursor = servicesCollection.find({});
            const service = await cursor.toArray();
            res.json(service);
        });

        app.get('/services', async (req, res) => {
            const email = req.query.email;
            const date = req.query.date;
            const query = { email: email, date: date }
            const cursor = servicesCollection.find(query);
            const services = await cursor.toArray();
            res.json(services);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await servicesCollection.findOne(query);
            res.json(result);
        })


        app.delete('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) };
            const review = await servicesCollection.deleteOne(query);
            res.json(review);
        })
        app.post('/services', async (req, res) => {
            const name = req.body.name;
            const details = req.body.details;
            const price = req.body.price;
            const technology = req.body.technology;
            const postDate = req.body.postDate;
            const pic = req.files.image;
            const picData = pic.data;
            console.log(req.body);
            console.log('files', req.files);
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64');
            const services = {
                name,
                details,
                price,
                technology,
                postDate,
                image: imageBuffer
            }
            const result = await servicesCollection.insertOne(services);
            res.json(result);
        })



        //get reviews
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const review = await cursor.toArray()
            res.send(review)
        });

        // post reviews
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            console.log('hitting the review', req.body);
            console.log('got user', result);
            res.json(result);
        })
        // get single reviews

        app.get('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const review = await reviewsCollection.findOne(query);
            res.json(review);
        })

        // delete single reviews
        app.delete('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) };
            const review = await reviewsCollection.deleteOne(query);
            res.json(review);
        })



        //blogs
        app.get('/blogs', async (req, res) => {
            const cursor = blogsCollection.find({});
            const blog = await cursor.toArray();
            res.json(blog);
        });

        app.get('/blogs', async (req, res) => {
            const email = req.query.email;
            const date = req.query.date;
            const query = { email: email, date: date }
            const cursor = blogsCollection.find(query);
            const blogs = await cursor.toArray();
            res.json(blogs);
        })


        app.get('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await blogsCollection.findOne(query);
            res.json(result);
        })


        app.delete('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) };
            const review = await blogsCollection.deleteOne(query);
            res.json(review);
        })
        app.post('/blogs', async (req, res) => {
            const name = req.body.name;
            const details = req.body.details;
            const postDate = req.body.postDate;
            const pic = req.files.image;
            const picData = pic.data;
            console.log(req.body);
            console.log('files', req.files);
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64');
            const blogs = {
                name,
                details,
                postDate,
                image: imageBuffer
            }
            const result = await blogsCollection.insertOne(blogs);
            res.json(result);
        })




        // get orders
        app.get('/orders', async (req, res) => {
            const cursor = ordersCollection.find({});
            const orders = await cursor.toArray();
            res.send(orders);
        })

        // get single order

        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            res.json(result);
        })

        // post orders 
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.json(result);
        })
        // update Order
        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const updatedOrder = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    orderStatus: updatedOrder.orderStatus
                },
            };
            const result = await ordersCollection.updateOne(filter, updateDoc, options)
            console.log('updating order ', id);
            res.json(result);
        })
        // delete single order
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await ordersCollection.deleteOne(query);
            res.json(order);
        })



    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Hero Rider!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})

