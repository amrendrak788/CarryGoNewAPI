const { db } = require("../database/db");

class TravellerModel {
  static all() {
    return db.read().travellers;
  }

  static findById(id) {
    return db.read().travellers.find((traveller) => traveller.id === id);
  }

  static update(id, patch) {
    const data = db.read();
    const traveller = data.travellers.find((item) => item.id === id);
    if (!traveller) return null;
    Object.assign(traveller, patch);
    db.write(data);
    return traveller;
  }
}

module.exports = { TravellerModel };
