function Card(suit, rank) {
	this.suit = suit;
	this.rank = rank;
	this.code = (1 << suit) | (1 << (2 * rank + 2));
}

Card.suits = ['c', 'd', 'h', 's'];
Card.ranks = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

Card.prototype.toString = function() {
	return Card.ranks[this.rank] + Card.suits[this.suit];
};

Card.prototype.equals = function(other) {
    return this.suit === other.suit && this.rank === other.rank;
}

module.exports = Card;
