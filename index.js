app.get('/shiftwise_data_by_phone/:phone', async (req, res) => {
    const rawPhone = req.params.phone; 
    const limitParam = req.query.limit;

    // Validate and parse limit from user input
    let limit = parseInt(limitParam);
    if (isNaN(limit) || limit <= 0) {
        limit = 365;  // Default limit if user doesn't provide valid number
    }

    const match = rawPhone.match(/(\d{10})(?=@)/);
    if (!match) {
        return res.status(400).json({ error: 'Invalid phone format. Expected format like 918800899174@c.us' });
    }

    const tenDigitPhone = match[1];

    const client = new MongoClient(mongoURI, { connectTimeoutMS: 30000 });

    try {
        await client.connect();
        const db = client.db(dbName);
        const whatsappCollection = db.collection('whatsapp_message');
        const shiftwiseCollection = db.collection('shiftwise_data');

        const whatsappDoc = await whatsappCollection.findOne({ phone: tenDigitPhone });

        if (!whatsappDoc) {
            return res.status(404).json({ error: `Phone number ${tenDigitPhone} not found in whatsapp_message collection.` });
        }

        const deviceno = whatsappDoc.deviceno;

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
