function Hand() {
	this.h = [0, 0, 0, 0, 0];
}

Hand.prototype.addCard = function(card) {
	this.h[card & 7] += card;
	this.h[3] |= card;
};

Hand.prototype.eval = function() {
	var count = this.h[0] + this.h[1] + this.h[2] + this.h[4] - (this.h[3] & -16);
	var evens = 0x55555540 & count;
	var odds = 0xAAAAAA80 & count;
	var result = 0;
	var kicker = this.h[3];
	var value, i;

	// Four of a Kind
	if (value = evens & (odds >>> 1)) {
		result = 7;
		kicker = this.h[3] ^ value;
		while (i = kicker & kicker - 1)
			kicker = i;
	}

	// Full House, AAABBBC or AAABBCD
	// AAABBBC
	else if (value = odds & odds - 1) {
		result = 6;
		value >>>= 1;
		kicker = (odds >>> 1) ^ value;
	}

	// AAABBCD
	else if (evens && odds) {
		result = 6;
		value = odds >>> 1;
		i = evens & evens - 1;
		kicker = i ? i : evens;
	}

	// Other hands go here
	else {

		// Flush
		for (i = 0; i < 4; i++) {
			var index = (1 << i) & 7;
			count = (this.h[index] >>> i) & 7;
			if (count >= 5) {
				kicker = this.h[index];
				result = 5;
				break;
			}
		}

		// Straight
		kicker &= -64;
		value = kicker | (kicker >>> 26) & 16;

		for (i = 0; i < 4; i++)
			value &= value << 2;

		if (value) {
			result += 4;
			value &= ~(value >>> 2);
			kicker = value;
		}

		// Flush continuation
		else if (i = result) {
			while (count-- > 5)
				kicker &= kicker - 1;
			value = kicker;
		}

		// Three of a Kind
		else if (value = odds >>> 1) {
			result = 3;
		}

		// Two Pair or Pair
		else if (evens) {
			odds = evens & evens - 1;
			i = odds & odds - 1;
			value = i ? odds : evens;
			result = 1 + (odds > 0);
		}

		// Clear unwanted kickers
		kicker ^= value;
		kicker &= kicker - 1;
		kicker &= kicker - (i == 0);
	}

	value = this.compress(value);
	kicker = this.compress(kicker);
	return (result < 9) ? result << 28 | value << 13 | kicker : (result << 27 | value << 12 | kicker >>> 1) * 2;
};

Hand.prototype.compress = function(card) {
	var result = 0;
	for (var i = 0; card; i++) {
		result |= (card & 1) << i;
		card >>>= 2;
	}
	return result >>> 3;
};

Hand.prototype.clear = function() {
	for (var i = 0; i < 5; i++)
		this.h[i] = 0;
};

Hand.prototype.decode = function(value) {
	var single = ['Deuce', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
	var plural = ['Deuces', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings', 'Aces'];
	
	var cards = [];
	for (var i = 26; i >= 0; i--)
		if (value & (1 << i))
			cards.push(i % 13);

	var rank = value >>> 28;

	switch (rank) {
		case 9:
			return 'Straight Flush, ' + single[cards[0]] + ' high';
			break;

		case 7:
			return 'Four of a Kind, ' + plural[cards[0]] + ' with ' + single[cards[1]];
			break;

		case 6:
			return 'Full House, ' + plural[cards[0]] + ' full of ' + plural[cards[1]];
			break;

		case 5:
			return 'Flush, ' + single[cards[0]] + ' high, with ' + single[cards[1]] + ', ' + single[cards[2]] + ', ' + single[cards[3]] + ', ' + single[cards[4]];
			break;

		case 4:
			return 'Straight, ' + single[cards[0]] + ' high';
			break;

		case 3:
			return 'Three of a Kind, ' + plural[cards[0]] + ' with ' + single[cards[1]] + ', ' + single[cards[2]];
			break;

		case 2:
			return 'Two Pair, ' + plural[cards[0]] + ' and ' + plural[cards[1]] + ' with ' + single[cards[2]];
			break;

		case 1:
			return 'Pair of ' + plural[cards[0]] + ' with ' + single[cards[1]] + ', ' + single[cards[2]] + ', ' + single[cards[3]];
			break;

		case 0:
			return 'High Card ' + single[cards[0]] + ' with ' + single[cards[1]] + ', ' + single[cards[2]] + ', ' + single[cards[3]] + ', ' + single[cards[4]];
			break;

		default:
			return false;
	}

}

module.exports = Hand;
