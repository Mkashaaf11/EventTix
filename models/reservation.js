class Reservation {
    constructor(eventId,uid,quant,price) {
      this.eventId = eventId;
      this.quantity = quant;
      this.amount=price*quant;
      this.uid=uid;
    }
  }
  module.exports = Reservation;