import { MongoClient, ObjectId } from 'mongodb';

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, limit: limitParam } = req.query;

  if (!phone) {
    return res.status(400).json({ error: 'Phone parameter is required' });
  }

  let limit = parseInt(limitParam);
  if (isNaN(limit) || limit <= 0) {
    limit = 50;
  }

  const match = phone.match(/(\d{10})(?=@)/);
  if (!match) {
    return res.status(400).json({ error: 'Invalid phone format. Expected format like 918800899174@c.us' });
  }

  const tenDigitPhone = match[1];

  try {
    const client = await connectToDatabase();
    const db = client.db('CNC_GENIE');

    const whatsappCollection = db.collection('whatsapp_message');
    const shiftwiseCollection = db.collection('shiftwise_data');

    const whatsappDoc = await whatsappCollection.findOne({ phone: tenDigitPhone });

    if (!whatsappDoc) {
      return res.status(404).json({ error: `Phone number ${tenDigitPhone} not found in whatsapp_message collection.` });
    }

    const deviceno = whatsappDoc.deviceno;

    const shiftwiseData = await shiftwiseCollection
      .find({ deviceno: deviceno })
      .sort({ _id: -1 })
      .limit(limit)
      .toArray();

    if (shiftwiseData.length === 0) {
      return res.status(404).json({ error: `No shiftwise_data found for deviceno: ${deviceno}.` });
    }

    return res.status(200).json({ deviceno, shiftwiseData });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
