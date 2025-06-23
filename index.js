const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');
const bcrypt = require('bcryptjs');
const app = express();
const { ObjectId } = require('mongodb'); 


app.use(cors({
  origin: '*', // Allow this origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
  credentials: true, // If cookies or auth headers are being sent
}));

app.use(express.json());
app.options('*', cors());


const mongoURI = 'mongodb+srv://050jrEt2VVOsD3WL:9%40eYE97T-dBqxMw@cluster0.zsgac.mongodb.net/';
const dbName = 'CNC_GENIE';

// Function to fetch data from MongoDB based on the device number
async function fetchDataByDevice(collectionName, deviceNo) {
    const client = new MongoClient(mongoURI);

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Fetch documents where the device number matches the parameter
        
        const documents = await collection.find({ deviceno: parseInt(deviceNo) }).toArray();
        console.log(documents);
        return documents;
    } catch (error) {
        console.error('Error fetching data from MongoDB:', error);
        throw error;
    } finally {
        await client.close();
    }
}



app.post('/api/device/:deviceNo', async (req, res) => {
  const { deviceNo } = req.params;
  let updates = req.body;

  // Ensure updates is an object
  updates = Array.isArray(updates) ? updates[0] : updates;

  // Remove _id field if present
  if ('_id' in updates) {
    delete updates._id;
  }

  const client = new MongoClient(mongoURI);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('machine_threshold');

    // Update data for the given device number
    const result = await collection.updateOne(
      { deviceno: parseInt(deviceNo) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: 'Device not found' });
    }

    res.send({ message: 'Device updated successfully', result });
  } catch (error) {
    console.error('Error updating data in MongoDB:', error);
    res.status(500).send({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
});


// API route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Hello from the backend!' });
});

// Login API (same as before)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
  }

  const client = new MongoClient(mongoURI);

  try {
      await client.connect();
      const db = client.db(dbName);
      const usersCollection = db.collection('users');

      const user = await usersCollection.findOne({ email });
      if (!user) {
          return res.status(400).json({ message: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(400).json({ message: 'Invalid email or password.' });
      }

      // Explicitly send a JSON response with status 201
      return res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
      return res.status(500).json({ message: 'Error logging in', error });
  } finally {
      await client.close();
  }
});


// Signup API (same as before)
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
  }

  const client = new MongoClient(mongoURI);

  try {
      await client.connect();
      const db = client.db(dbName);
      const usersCollection = db.collection('users');

      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
          return res.status(400).json({ message: 'Email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = {
          username,
          email,
          password: hashedPassword
      };

      await usersCollection.insertOne(newUser);

      // Explicitly send a JSON response with status 201
      return res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
      return res.status(500).json({ message: 'Error registering user', error });
  } finally {
      await client.close();
  }
});


// Fetch data from the "ON_OFF_data" collection based on deviceNo
app.get('/ONOff', async (req, res) => {
    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('ON/OFF_data');  // Corrected collection name

        // Retrieve all documents from the collection and convert to an array
        const data = await collection.find().toArray();

        // Respond with the data (not the MongoClient object)
        return res.json({ data });
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({ message: err.message });
    }
});



// Fetch data from the "machine_threshold" collection based on deviceNo
app.get('/machine_threshold/:deviceNo', async (req, res) => {
    const { deviceNo } = req.params;

    try {
        const data = await fetchDataByDevice('machine_threshold', deviceNo);
        return res.json({ message: data });
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({ message: err.message });
    }
});


app.get('/machine_threshold', async (req, res) => {
    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('machine_threshold');  // No leading slash

        // Assuming "deviceId" is the field that stores the device ID
        const uniqueDeviceIds = await collection.distinct('deviceno');
        return res.json({ uniqueDeviceIds });
    } catch (err) {
        console.error('Error:', err);
        return  res.status(500).json({ message: err.message });
    } finally {
        await client.close();  // Ensure the client is closed
    }
});



// Fetch data from the "shiftwise_data" collection based on deviceNo
app.get('/shiftwise/:deviceNo', async (req, res) => {
    const { deviceNo } = req.params;

    try {
        const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection("shiftwise_data");
        const data =  await collection.find({ "_id.deviceno": parseInt(deviceNo) }).toArray();
        ;
        return res.json({ message: data });
    } catch (err) {
        console.error('Error:', err);
        return   res.status(500).json({ message: err.message });
    }
});


app.get('/shiftwise', async (req, res) => {


  try {
      const client = new MongoClient(mongoURI, { connectTimeoutMS: 60000 });
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection("shiftwise_data");
      const data =  await collection.find().toArray();
     
      return res.json({ message: data });
  } catch (err) {
      console.error('Error:', err);
      return  res.status(500).json({ message: err.message });
  }
});


app.post('/add_operator', async (req, res) => {
  const { name, userID } = req.body;

  if (!name || !userID) {
      return res.status(400).json({ message: 'Operator name and userID are required.' });
  }

  const client = new MongoClient(mongoURI);

  try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('operators');

      const result = await collection.insertOne({ name, userID });

      // Explicitly send a JSON response with status 201
      return res.status(201).json({ message: 'Operator added successfully', operatorId: result.insertedId });
  } catch (err) {
      return res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
      await client.close();
  }
});


  app.get('/get_operators_by_userid/:userID', async (req, res) => {
    try {
      const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('operators');
      
      // Get the userID from query parameters
      const { userID } = req.params;
  
      // Validate that userID is provided
      if (!userID) {
        return res.status(400).json({ message: 'userID is required.' });
      }
  
      // Fetch operators based on the userID
      const operators = await collection.find({ userID }).toArray();
  
      // Respond with the list of operators
      return res.status(200).json({ operators });
    } catch (err) {
      console.error('Error fetching operators:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } 
  });
  

  // POST /save_operator_selection endpoint
  // app.post('/save_operator_selection', async (req, res) => {
  //   // Extract data from request body
  //   const { deviceno, channel, date, shift, operatorId } = req.body;
  
  //   // Validate required fields
  //   if (!deviceno || !channel || !date || !shift || !operatorId) {
  //     return res.status(400).json({ message: 'Missing required fields.' });
  //   }
  
  //   const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
  
  //   try {
  //     // Connect to MongoDB
  //     await client.connect();
  //     const db = client.db(dbName);
  //     const collection = db.collection('save_operator_selection');
  
  //     // Generate a unique _id using composite fields
  //     const _id = `${deviceno}_${channel}_${shift}_${date}`;
  
  //     // Check if a document with the same _id already exists
  //     const existingSelection = await collection.findOne({ _id });
  
  //     if (existingSelection) {
  //       // If it exists, update the document
  //       const updatedSelection = await collection.updateOne(
  //         { _id }, // Filter to find the document
  //         {
  //           $set: { deviceno, channel, date, shift, operatorId }, // Fields to update
  //         }
  //       );
  //       return  res.status(200).json({ message: 'Operator selection updated successfully.', updatedSelection });
  //     } else {
  //       // If it doesn't exist, create a new document
  //       const newSelection = {
  //         _id,
  //         deviceno,
  //         channel,
  //         date,
  //         shift,
  //         operatorId,
  //       };
  //       await collection.insertOne(newSelection);
  //       return res.status(201).json({ message: 'Operator selection saved successfully.', newSelection });
  //     }
  //   } catch (error) {
  //     console.error('Error saving operator selection:', error);
  //     return res.status(500).json({ message: 'Error saving operator selection.', error: error.message });
  //   } finally {
  //     await client.close();
  //   }
  // });
  // New GET API to fetch shiftwise data based on phone number
app.get('/shiftwise_data_by_phone/:phone', async (req, res) => {
    const fullPhone = req.params.phone; // Example: 918800899174@c.us
    const limit = parseInt(req.query.limit) || 50; // Default limit to 50 if not provided

    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });

    try {
        await client.connect();
        const db = client.db(dbName);
        const whatsappCollection = db.collection('whatsapp_message');
        const shiftwiseCollection = db.collection('shiftwise_data');

        // Search in whatsapp_message using full phone format
        const whatsappDoc = await whatsappCollection.findOne({ phone: fullPhone });

        if (!whatsappDoc) {
            return res.status(404).json({ error: `Phone number ${fullPhone} not found in whatsapp_message collection.` });
        }

        const deviceno = whatsappDoc.deviceno;

        // Fetch shiftwise_data documents with matching deviceno, sort _id descending, and apply limit
        const shiftwiseData = await shiftwiseCollection.find({ deviceno: deviceno })
            .sort({ _id: -1 })
            .limit(limit)
            .toArray();

        if (shiftwiseData.length === 0) {
            return res.status(404).json({ error: `No shiftwise_data found for deviceno: ${deviceno}.` });
        }

        return res.status(200).json({ deviceno, shiftwiseData });
    } catch (err) {
        console.error('Error fetching shiftwise_data:', err);
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        await client.close();
    }
});




  app.post('/save_operator_selection', async (req, res) => {
    // Extract data from request body
    const { deviceno, channel, date, shift, operatorId } = req.body;
  
    // Validate required fields
    if (!deviceno || !channel || !date || !shift || !operatorId) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
  
    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
  
    try {
      // Connect to MongoDB
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('save_operator_selection');
  
      // Generate a unique _id using composite fields
      const _id = `${deviceno}_${channel}_${shift}_${date}`;
  
      // Attempt to update if document already exists, else insert a new document
      const updateResult = await collection.updateOne(
        { _id },
        {
          $set: { deviceno, channel, date, shift, operatorId },
        },
        { upsert: true } // This option inserts if document does not exist
      );
  
      if (updateResult.matchedCount > 0) {
        return res.status(200).json({ message: 'Operator selection updated successfully.' });
      } else {
        return res.status(201).json({ message: 'Operator selection saved successfully.' });
      }
    } catch (error) {
      if (error.code === 11000) {
        // Handle duplicate key error specifically
        return res.status(409).json({ message: 'Duplicate entry exists.' });
      }
      console.error('Error saving operator selection:', error);
      return res.status(500).json({ message: 'Error saving operator selection.', error: error.message });
    } finally {
      await client.close();
    }
  });
  

  
  app.get('/get_operator_selections', async (req, res) => {
    const client = new MongoClient(mongoURI, { connectTimeoutMS: 600000 });
  
    try {
      // Connect to the MongoDB client
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('save_operator_selection'); // Use your collection name
  
      // Fetch all documents from the collection
      const data = await collection.find().toArray();
  
      return res.status(200).json({ data });
    } catch (error) {
      console.error('Error fetching data: ' + error.message);
      return res.status(500).json({ message: 'Error fetching data', error: error.message });
    } 
  });
 
  app.get('/operatorwise_data',async(req,res) => {
    const client = new MongoClient(mongoURI, { connectTimeoutMS: 600000 });
    
    try {
      // Connect to the MongoDB client
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('operatorwise_data'); // Use your collection name
  
      // Fetch all documents from the collection
      const data = await collection.find().toArray();
  
      return res.status(200).json({ data });
    } catch (error) {
      console.error('Error fetching data: ' + error.message);
      return res.status(500).json({ message: 'Error fetching data', error: error.message });
    } 
  })

  app.put('/edit', async (req, res) => {
    const { collectionName, documentId, updates } = req.body;

    // Validate the request body
    if (!collectionName || !documentId || !updates) {
        return res.status(400).json({
            error: 'collectionName, documentId, and updates are required in the request body.',
        });
    }

    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Update the document by its _id
        const result = await collection.updateOne(
            { _id: new ObjectId(documentId) }, // Filter by document _id
            { $set: updates } // Apply the updates
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: 'No document found with the specified _id.',
            });
        }

        res.status(200).json({
            message: 'Document updated successfully',
            modifiedCount: result.modifiedCount,
        });
    } catch (err) {
        console.error('Error updating document:', err.message);
        res.status(500).json({
            error: 'Failed to update document',
            details: err.message,
        });
    } finally {
        await client.close(); // Ensure the client is closed
    }
});
  app.get('/breakwise_data',async(req,res) => {
    const client = new MongoClient(mongoURI, { connectTimeoutMS: 600000 });
    
    try {
      // Connect to the MongoDB client
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('breakwise_data'); // Use your collection name
  
      // Fetch all documents from the collection
      const data = await collection.find().toArray();
      console.log(data);
      return res.status(200).json({ data });
    } catch (error) {
      console.error('Error fetching data: ' + error.message);
      return res.status(500).json({ message: 'Error fetching data', error: error.message });
    } 
  })

  app.delete('/delete_operator/:id', async (req, res) => {
    const reasonId = req.params.id; // Get the reason ID from the request params
  console.log(reasonId);
    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
  
    try {
      // Connect to the MongoDB client
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('operators');
      const objectId = new ObjectId(reasonId);
      // Try to find and delete the reason with the given ID
        const result = await collection.deleteOne({ _id: objectId });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'delete_operator not found.' });
        }
  
      res.status(200).json({ message: 'delete_operator deleted successfully.' });
  
    } catch (error) {
      console.error('Error deleting reason:', error);
      res.status(500).json({ message: 'Failed to delete the reason.', error: error.message });
    } finally {
      // Ensure client is closed even if there’s an error
      await client.close();
    }
  });

  app.put('/edit_operator/:id', async (req, res) => {
    const reasonId = req.params.id; // Get the reason ID from the request parameters
    const { name } = req.body; // Get the new values from the request body
    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
    // Log the incoming request data for debugging
    console.log('Updating reason with ID:', reasonId);
    console.log('Payload:', req.body);
  
    // Ensure the ID is valid
    if (!ObjectId.isValid(reasonId)) {
      return res.status(400).json({ message: 'Invalid ID format.' });
    }
  
    // Convert the reasonId to ObjectId
    const objectId = new ObjectId(reasonId);
  
    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('operators');
  
      // Check if the reason exists before updating
      const existingReason = await collection.findOne({ _id: objectId });
      if (!existingReason) {
        return res.status(404).json({ message: 'Reason not found.' });
      }
  
      // Update the reason in the database
      const result = await collection.updateOne(
        { _id: objectId }, // Find the document with the given ID
        { $set: {name : name } } // Set the new values
      );
  
      // Log the result of the update operation
      console.log('Update Result:', result);
  
      // Check if any document was updated
      if (result.modifiedCount === 0) {
        return res.status(400).json({ message: 'No changes made.' });
      }
  
      return res.status(200).json({ message: 'Reason updated successfully.' });
    } catch (error) {
      console.error('Error updating reason:', error.message || error);
      return res.status(500).json({ message: 'Failed to update reason.', error: error.message || error });
    } finally {
      await client.close(); // Make sure to close the client connection
    }
  });

  app.post('/reasons', async (req, res) => {
    try {
      const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('Reasons');
  
      // Get the operator data and userID from the request body
      const { reason, userID ,additionalDetails} = req.body;
  
      // Validate that both name and userID are provided
      if (!reason || !userID) {
        return res.status(400).json({ message: 'Operator name and userID are required.' });
      }
  
      // Insert the new operator into the collection with the userID
      const result = await collection.insertOne({ reason, userID ,additionalDetails});
  
      // Respond with success
      return res.status(201).json({ message: 'Operator added successfully', operatorId: result.insertedId });
    } catch (err) {
      console.error('Error adding operator:', err);
      return res.status(500).json({ message: 'Internal server error', error: err.message });
    } 
  });



  app.post('/save_off_reasons', async (req, res) => {
    const { reasons } = req.body; // expects { reasons: [...] }
    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('save_off_reasons');
 
    try {
      // Insert many reasons into the database
      await collection.insertMany(
        reasons.map(item => ({
          deviceNo: item.deviceno,
          channel: item.channel,
          date: item.date,
          time: item.time,
          status: item.status,
          shift: item.shift,
          endDate: item.enddate,
          endTime: item.endtime,
          reason: item.reason,
        }))
      );
      return res.status(200).json({ message: 'Reasons saved successfully' });
    } catch (error) {
      console.error('Error saving reasons:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });


  app.get('/get_Reasons/:userID', async (req, res) => {
    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
  
    try {
      // Connect to the MongoDB client
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('Reasons'); // Use your collection name
      const { userID } = req.params;
      // Fetch all documents from the collection
      const data = await collection.find({userID:userID}).toArray();
  
      return res.status(200).json({ data });
    } catch (error) {
      console.error('Error fetching data: ' + error.message);
      return res.status(500).json({ message: 'Error fetching data', error: error.message });
    } 
  })

  app.get('/get_Reasons', async (req, res) => {
    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
  
    try {
      // Connect to the MongoDB client
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('Reasons'); // Use your collection name
  
      // Fetch all documents from the collection
      const data = await collection.find({}).toArray();
  
      return res.status(200).json({ data });
    } catch (error) {
      console.error('Error fetching data: ' + error.message);
      return res.status(500).json({ message: 'Error fetching data', error: error.message });
    } 
  })


  app.get('/get_save_off_reasons', async (req, res) => {
    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
  
    try {
      // Connect to the MongoDB client
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('save_off_reasons'); // Use your collection name
  
      // Fetch all documents from the collection
      const data = await collection.find({}).toArray();
  
      return res.status(200).json({ data });
    } catch (error) {
      console.error('Error fetching data: ' + error.message);
      return  res.status(500).json({ message: 'Error fetching data', error: error.message });
    } 
  })
// Serve the static React app (if you are serving React from the same server)
app.delete('/reasons/:id', async (req, res) => {
  const reasonId = req.params.id; // Get the reason ID from the request params
console.log(reasonId);
  const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });

  try {
    // Connect to the MongoDB client
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('Reasons');
    const objectId = new ObjectId(reasonId);
    // Try to find and delete the reason with the given ID
      const result = await collection.deleteOne({ _id: objectId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Reason not found.' });
      }

    res.status(200).json({ message: 'Reason deleted successfully.' });

  } catch (error) {
    console.error('Error deleting reason:', error);
    res.status(500).json({ message: 'Failed to delete the reason.', error: error.message });
  } finally {
    // Ensure client is closed even if there’s an error
    await client.close();
  }
});


app.delete('/delete', async (req, res) => {
    const { collectionName } = req.query;
    const { id } = req.query; // Extracting id from query parameters

    // Validate the request
    if (!collectionName || !id) {
        return res.status(400).json({
            error: 'collectionName and id are required in the query parameters.',
        });
    }

    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Delete the document by its _id
        const result = await collection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: 'No document found with the specified _id.',
            });
        }

        res.status(200).json({
            message: 'Document deleted successfully',
            deletedCount: result.deletedCount,
        });
    } catch (err) {
        console.error('Error deleting document:', err.message);
        res.status(500).json({
            error: 'Failed to delete document',
            details: err.message,
        });
    } finally {
        await client.close(); // Ensure the client is closed
    }
});

// POST endpoint to insert a document
app.post('/insert', async (req, res) => {
  const { collectionName, document } = req.body;

  // Validate the request body
  if (!collectionName || !document) {
    return res.status(400).json({
      error: 'Both collectionName and document are required in the request body.',
    });
  }

  const client = new MongoClient(mongoURI);

  try {
    // Connect to the MongoDB client
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Insert the document into the specified collection
    const result = await collection.insertOne(document);

    // Respond with success
    res.status(201).json({
      message: 'Document inserted successfully',
      insertedId: result.insertedId,
    });
  } catch (err) {
    console.error('Error inserting document:', err.message);
    res.status(500).json({
      error: 'Failed to insert document',
      details: err.message,
    });
  } finally {
    // Ensure the MongoDB client is closed
    await client.close();
  }
});

app.get('/getAll', async (req, res) => {
  const { collectionName } = req.query;

  if (!collectionName) {
      return res.status(400).json({
          error: 'collectionName is required in the query parameters.',
      });
  }

  const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });

  try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();

      res.status(200).json({
          message: 'Documents retrieved successfully',
          data: documents,
      });
  } catch (err) {
      res.status(500).json({
          error: 'Failed to retrieve documents',
          details: err.message,
      });
  } finally {
      await client.close(); // Ensure the client is closed
  }
});

app.put('/edit', async (req, res) => {
  const { collectionName, documentId, updates } = req.body;

  // Validate the request body
  if (!collectionName || !documentId || !updates) {
    return res.status(400).json({
      error: 'collectionName, documentId, and updates are required in the request body.',
    });
  }

  const client = new MongoClient(mongoURI);

  try {
    // Connect to the MongoDB client
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Update the document by its _id
    const result = await collection.updateOne(
      { _id: new ObjectId(documentId) }, // Filter by document _id
      { $set: updates } // Apply the updates
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'No document found with the specified _id.',
      });
    }

    res.status(200).json({
      message: 'Document updated successfully',
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error('Error updating document:', err.message);
    res.status(500).json({
      error: 'Failed to update document',
      details: err.message,
    });
  } finally {
    // Ensure the MongoDB client is closed
    await client.close();
  }
});

// Assuming you have Express set up
app.put('/reasons/:id', async (req, res) => {
  const reasonId = req.params.id; // Get the reason ID from the request parameters
  const { reason, additionalDetails } = req.body; // Get the new values from the request body
  const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });
  // Log the incoming request data for debugging
  console.log('Updating reason with ID:', reasonId);
  console.log('Payload:', req.body);

  // Ensure the ID is valid
  if (!ObjectId.isValid(reasonId)) {
    return res.status(400).json({ message: 'Invalid ID format.' });
  }

  // Convert the reasonId to ObjectId
  const objectId = new ObjectId(reasonId);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('Reasons');

    // Check if the reason exists before updating
    const existingReason = await collection.findOne({ _id: objectId });
    if (!existingReason) {
      return res.status(404).json({ message: 'Reason not found.' });
    }

    // Update the reason in the database
    const result = await collection.updateOne(
      { _id: objectId }, // Find the document with the given ID
      { $set: { reason, additionalDetails } } // Set the new values
    );

    // Log the result of the update operation
    console.log('Update Result:', result);

    // Check if any document was updated
    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: 'No changes made.' });
    }

    return res.status(200).json({ message: 'Reason updated successfully.' });
  } catch (error) {
    console.error('Error updating reason:', error.message || error);
    return res.status(500).json({ message: 'Failed to update reason.', error: error.message || error });
  } finally {
    await client.close(); // Make sure to close the client connection
  }
});



// Start the server on the specified port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
