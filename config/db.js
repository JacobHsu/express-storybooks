const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  // Optional DNS override — some ISPs (e.g. HiNet) refuse Node's SRV (mongodb+srv)
  // lookups, causing "querySrv ECONNREFUSED". Set DNS_SERVERS in .env to use
  // alternative resolvers, e.g. DNS_SERVERS=8.8.8.8,1.1.1.1
  // (Runs here, not at module load, because .env is parsed after this module is required.)
  if (process.env.DNS_SERVERS) {
    const servers = process.env.DNS_SERVERS.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (servers.length) {
      dns.setServers(servers);
    }
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

module.exports = connectDB;
