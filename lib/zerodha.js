const KiteConnect = require("kiteconnect").KiteConnect;
require("dotenv").config();

class ZerodhaAPI {
  constructor() {
    if (!process.env.KITE_API_KEY || !process.env.KITE_ACCESS_TOKEN) {
      throw new Error("API key and access token must be provided in environment variables");
    }

    this.kite = new KiteConnect({
      api_key: process.env.KITE_API_KEY,
      access_token: process.env.KITE_ACCESS_TOKEN,
      
    });
  }


  async getQuote(symbols) {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new Error("Symbols must be a non-empty array");
    }

    try {
      console.log("Fetching quotes for:", symbols);
      const quotes = await this.kite.getQuote(symbols);
      console.log(quotes);
      
      return quotes;
    } catch (error) {
      console.error("Error fetching quotes:", error.message);
      throw error;
    }
  }
}

module.exports = ZerodhaAPI;
