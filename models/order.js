class Order{
    constructor(itemId, quant,uid,status){
      this.itemId=itemId;
      this.quantity = quant;
      this.uid=uid;
      this.status=status;
    }
}
  module.exports = Order;