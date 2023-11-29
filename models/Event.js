class Event {
  constructor(
    eventName,
    price,
    orgId,
    TotalTickets,
    RemainingTickets,
    eventDate,
    endDate,
    eventTime,
    Description,
    categoryId,
    cityCode,
    status
  ) {
    this.eventName = eventName;
    this.price = price;
    this.orgId = orgId;
    this.TotalTickets = TotalTickets;
    this.RemainingTickets = RemainingTickets;
    this.eventDate = eventDate;
    this.endDate = endDate;
    this.eventTime = eventTime;
    this.Description = Description;
    this.categoryId = categoryId;
    this.cityCode = cityCode;
    this.status = status;
  }
}

module.exports = Event;
