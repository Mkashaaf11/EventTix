class Event {
  constructor(
    eventName,
    price,
    orgId,
    TotalTickets,
    RemainingTickets,
    eventDate,
    eventTime,
    Description,
    categoryId,
    cityCode
  ) {
    this.eventName = eventName;
    this.price = price;
    this.orgId = orgId;
    this.TotalTickets = TotalTickets;
    this.RemainingTickets = RemainingTickets;
    this.eventDate = eventDate;
    this.eventTime = eventTime;
    this.Description = Description;
    this.categoryId = categoryId;
    this.cityCode = cityCode;
  }
}

module.exports = Event;
