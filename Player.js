var Hand = require('./Hand.js');

function Player(socket, name) {
	this.socket = socket;
	this.name = name;
	this.seat = null;
	this.table = null;
	this.connected = true;
	this.ready = false;
	this.won = [];
	this.equity = 0;

	this.cards = [];
	this.hand = new Hand();
	this.value = null;
	this.stack = 0;
	this.bet = 0;
	this.folded = true;
	this.acted = false; // true if player has acted at least once in current betting round
	this.pot = 0;

	this.admin = false;
}

Player.prototype.receiveHand = function(cards) {
	this.folded = false;
	this.acted = false;
	this.hand.clear();
	this.cards = [];
	for (var i = 0; i < cards.length; i++) {
		this.cards.push(cards[i]);
	}
}

Player.prototype.pay = function(amount) {
	if (amount == 0) return 0;
	if (this.stack <= amount) {
		amount = this.stack;
		this.stack = 0;
		this.bet += amount;
		return amount;
	}
	else {
		this.stack -= amount;
		this.bet += amount;
		return amount;
	}
}

Player.prototype.placeBet = function(amount) {
	if (amount == 0) return 0;
	if (this.stack + this.bet <= amount) {
		amount = this.stack + this.bet;
		this.stack = 0;
		this.bet = amount;
		return amount;
	}
	else {
		this.stack -= amount - this.bet;
		this.bet = amount;
		return amount;
	}
}

Player.prototype.win = function(amount) {
	this.stack += amount;
}

Player.prototype.allIn = function() {
	return this.stack == 0;
}

module.exports = Player;
